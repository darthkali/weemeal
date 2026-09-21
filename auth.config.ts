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

// Obergrenze der WeeMeal-Session im keycloak-Modus, in Sekunden.
const KEYCLOAK_SESSION_MAX_AGE = 60 * 60;

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
    // Im keycloak-Modus hängt die WeeMeal-Session an der Keycloak-Session und
    // wird bei jedem Request gegen sie geprüft; die Stunde ist eine
    // zusätzliche Obergrenze (rollend, solange Requests laufen). In den
    // anderen Modi gibt es nichts nachzuprüfen — dort bleibt der
    // Auth.js-Default (30 Tage).
    session: {strategy: 'jwt', ...(isKeycloakAuth() && {maxAge: KEYCLOAK_SESSION_MAX_AGE})},
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

            // Login: die Keycloak-Tokens ins JWT legen, damit die Session
            // später nachprüfbar (refresh_token) und beendbar (id_token) ist.
            // Das Access-Token bleibt draußen — es wird nie gebraucht und
            // bläht nur das Cookie auf, das jeder Request mitschleppt.
            if (account) {
                token.refreshToken = account.refresh_token;
                token.idToken = account.id_token;
                token.expiresAt = account.expires_at;
                return token;
            }

            // Nur bei abgelaufenem Access-Token refreshen, nicht bei jedem
            // Request — der Callback läuft auch im edge-Proxy.
            if (!isAccessTokenExpired(token.expiresAt)) {
                return token;
            }

            // `null` verwirft die Session (Auth.js v5): eine in Keycloak
            // beendete Session, ein deaktivierter User oder ein entzogenes
            // weemeal-user landen damit sauber auf der Login-Seite, statt den
            // Request abzuwerfen.
            return refreshKeycloakSession(token);
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
            await endKeycloakSession(message.token?.idToken);
        },
    },
} satisfies NextAuthConfig;

export default authConfig;
