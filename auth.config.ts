import type {NextAuthConfig} from 'next-auth';

// Pro Deployment fest gewählter Auth-Modus (ADR 0001).
export const AUTH_MODE = process.env.AUTH_MODE ?? 'local';

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
