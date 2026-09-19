import type {NextAuthConfig} from 'next-auth';

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

/**
 * Edge-sicherer Teil der Auth.js-Konfiguration: keine DB-, keine
 * Node-Abhängigkeiten. Wird sowohl von der Middleware (nur JWT-Prüfung) als
 * auch vom vollen Node-Setup in `auth.ts` verwendet. Die Provider (die den
 * UserService/Mongoose anfassen) kommen ausschließlich in `auth.ts` dazu.
 */
export const authConfig = {
    trustHost: true,
    session: {strategy: 'jwt'},
    pages: {
        signIn: '/login',
    },
    providers: [],
    callbacks: {
        async jwt({token, user}) {
            if (user) {
                token.role = user.role;
                token.authMode = AUTH_MODE;
            }
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
} satisfies NextAuthConfig;

export default authConfig;
