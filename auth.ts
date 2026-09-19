import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import authConfig, {AUTH_MODE} from './auth.config';
import {authorizeCredentials} from '@/lib/auth/authorize';

// Voller Node-Setup: hier — und nur hier — hängt der Credentials-Provider am
// UserService (Mongoose). Die Middleware nutzt stattdessen authConfig direkt,
// bleibt damit edge-sicher.
const providers =
    AUTH_MODE === 'local'
        ? [
              Credentials({
                  credentials: {
                      username: {label: 'Username', type: 'text'},
                      password: {label: 'Password', type: 'password'},
                  },
                  authorize: (credentials) => authorizeCredentials(credentials),
              }),
          ]
        : [];

// keycloak-Modus (OIDC) kommt in T6 (#147). Bis dahin registriert ein anderer
// AUTH_MODE keinen Provider — laut warnen, statt still auszusperren.
if (providers.length === 0) {
    console.warn(
        `[auth] AUTH_MODE='${AUTH_MODE}' registriert keinen Login-Provider — kein Login möglich. ` +
            `Aktuell wird nur 'local' unterstützt (keycloak folgt in T6).`
    );
}

export const {handlers, auth, signIn, signOut} = NextAuth({
    ...authConfig,
    providers,
});
