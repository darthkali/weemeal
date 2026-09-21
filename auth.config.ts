import type {NextAuthConfig} from 'next-auth';
import {
    endKeycloakSession,
    isAccessTokenExpired,
    refreshKeycloakSession,
} from '@/lib/auth/keycloakSession';

// Pro Deployment fest gewählter Auth-Modus (ADR 0001, ADR 0003).
export type AuthMode = 'keycloak' | 'local' | 'none';

// Default ist 'none': eine Instanz ohne Auth-Konfiguration startet ohne
// Login — und damit auch ohne Pflicht, AUTH_SECRET zu setzen. Zugangsschutz
// ist eine bewusste Konfigurationsentscheidung des Betreibers (ADR 0003).
export const AUTH_MODE = ((process.env.AUTH_MODE || 'none').trim() as AuthMode);

// 'none': WeeMeal läuft ohne Authentifizierung — keine Session, kein Login,
// kein User, kein Admin-Panel. Jeder Besucher sieht und bearbeitet alles.
export function isAuthDisabled(): boolean {
    return AUTH_MODE === 'none';
}

// User-Verwaltung und eigene Passwörter gibt es nur im local-Modus; im
// keycloak-Modus liegen sie beim Identity Provider, im none-Modus nirgends.
export function isLocalAuth(): boolean {
    return AUTH_MODE === 'local';
}

export function isKeycloakAuth(): boolean {
    return AUTH_MODE === 'keycloak';
}

// Client-ID des Keycloak-Clients: nötig, um die Client-Rollen im Token der
// richtigen Anwendung zuzuordnen. Edge-sicher, daher hier statt in auth.ts.
export const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID;

/**
 * Edge-sicherer Teil der Auth.js-Konfiguration: keine DB-, keine
 * Node-Abhängigkeiten. Wird sowohl von der Middleware (nur JWT-Prüfung) als
 * auch vom vollen Node-Setup in `auth.ts` verwendet. Die Provider (die den
 * UserService/Mongoose anfassen) kommen ausschließlich in `auth.ts` dazu.
 */
export const authConfig = {
    trustHost: true,
    // Auth.js begründet mit `AUTH_DEBUG=true` im Log, warum es eine Session
    // verwirft (defekte Cookies, Konfigurationsfehler) — sonst schweigt es.
    // Kein Dauerbetrieb: die Ausgabe ist gesprächig und nennt Token-Interna.
    debug: process.env.AUTH_DEBUG === 'true',
    // Die Lebensdauer bleibt in jedem Modus beim Auth.js-Default. Im
    // keycloak-Modus entscheidet ohnehin die Refresh-Prüfung, wie lange die
    // Session trägt — eine kürzere Frist bringt dagegen nichts und macht die
    // Anmeldung nur davon abhängig, dass die Uhren aller Beteiligten stimmen.
    session: {strategy: 'jwt'},
    pages: {
        signIn: '/login',
    },
    providers: [],
    callbacks: {
        // Im keycloak-Modus entscheidet allein der Token-Claim über den
        // Zutritt: ohne aufgelöste Role (weemeal-user/weemeal-admin) kommt
        // niemand rein (ADR 0001). Die Auflösung selbst passiert im
        // profile-Mapper des Providers, damit sie an einer Stelle sitzt.
        async signIn({user}) {
            if (!isKeycloakAuth()) {
                return true;
            }
            return Boolean((user as {role?: unknown} | undefined)?.role);
        },
        async jwt({token, user, account}) {
            if (user) {
                token.role = user.role;
                token.authMode = AUTH_MODE;
            }

            if (!isKeycloakAuth()) {
                return token;
            }

            // Was niemand liest, muss auch nicht bei jedem Request mitreisen:
            // angezeigt wird der Name, entschieden wird über Role und `sub`.
            delete token.email;
            delete token.picture;

            // Login: das Refresh-Token ins JWT legen — damit ist die Session
            // nachprüfbar und beendbar. Access- und ID-Token bleiben draußen:
            // sie werden nie gebraucht und blähen das Cookie auf, das jeder
            // Request mitschleppt und das über ~4 KB geteilt werden muss.
            if (account) {
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
                return token;
            }

            // Die Refresh-Prüfung selbst sitzt nicht hier, sondern im Proxy
            // (siehe `proxyAuthConfig`): nur dort kann das Ergebnis auch ins
            // Cookie zurück.
            return token;
        },
        async session({session, token}) {
            if (session.user) {
                session.user.id = token.sub ?? '';
                session.user.role = token.role;
            }
            session.authMode = token.authMode ?? AUTH_MODE;
            return session;
        },
    },
    events: {
        // RP-initiated Logout: „Abmelden" beendet nicht nur das App-Cookie,
        // sondern auch die Session im Realm — sonst ginge der nächste Login
        // still per SSO durch (auf geteilten Geräten unerwartet).
        async signOut(message) {
            if (!isKeycloakAuth() || !('token' in message)) {
                return;
            }
            // Scheitert der Realm, bleibt es beim lokalen Logout —
            // endKeycloakSession schluckt den Fehler selbst.
            await endKeycloakSession(message.token?.refreshToken);
        },
    },
} satisfies NextAuthConfig;

/**
 * Die Konfiguration des Proxy — `authConfig` plus die Refresh-Prüfung.
 *
 * Der `jwt`-Callback läuft pro Request an mehreren Stellen: im Proxy, in
 * `auth()` einer Server Component und in den Auth.js-Endpunkten. Schreiben
 * kann das Ergebnis nur, wer die Antwort in der Hand hat — der Proxy reicht
 * sein `Set-Cookie` durch, eine Server Component kann keine Cookies setzen.
 * Liefe die Prüfung überall, würde dasselbe Refresh-Token mehrfach eingelöst;
 * bei rotierenden Refresh-Tokens wäre es nach dem ersten Mal verbraucht und
 * die zweite Prüfung schlüge grundlos fehl.
 *
 * Deshalb prüft allein das Gate, durch das ohnehin jeder geschützte Request
 * läuft. Die anderen Stellen nehmen das Token so, wie es im Cookie steht.
 */
export const proxyAuthConfig = {
    ...authConfig,
    callbacks: {
        ...authConfig.callbacks,
        async jwt(params) {
            const token = await authConfig.callbacks.jwt(params);

            if (!token || !isKeycloakAuth() || params.account) {
                return token;
            }

            // Nur bei abgelaufenem Access-Token nachfragen, nicht bei jedem
            // Request.
            if (!isAccessTokenExpired(token.expiresAt)) {
                return token;
            }

            // `null` verwirft die Session (Auth.js v5): eine in Keycloak
            // beendete Session, ein deaktivierter User oder ein entzogenes
            // weemeal-user landen damit sauber auf der Login-Seite, statt den
            // Request abzuwerfen.
            return refreshKeycloakSession(token);
        },
    },
} satisfies NextAuthConfig;

export default authConfig;
