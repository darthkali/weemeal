import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Keycloak from 'next-auth/providers/keycloak';
import authConfig, {
    AUTH_MODE,
    KEYCLOAK_CLIENT_ID,
    isAuthDisabled,
    isKeycloakAuth,
    isLocalAuth,
} from './auth.config';
import {authorizeCredentials} from '@/lib/auth/authorize';
import {mapKeycloakProfile, type AuthJsUser} from '@/lib/auth/keycloakProfile';

// Voller Node-Setup: hier — und nur hier — hängt der Credentials-Provider am
// UserService (Mongoose). Die Middleware nutzt stattdessen authConfig direkt,
// bleibt damit edge-sicher.
function buildProviders() {
    if (isLocalAuth()) {
        return [
            Credentials({
                credentials: {
                    username: {label: 'Username', type: 'text'},
                    password: {label: 'Password', type: 'password'},
                },
                authorize: (credentials) => authorizeCredentials(credentials),
            }),
        ];
    }

    if (isKeycloakAuth()) {
        return [
            Keycloak({
                issuer: process.env.KEYCLOAK_ISSUER,
                clientId: KEYCLOAK_CLIENT_ID,
                clientSecret: process.env.KEYCLOAK_CLIENT_SECRET,
                // Die Role kommt aus den Token-Claims; ist keine WeeMeal-Rolle
                // dabei, bleibt sie null und der signIn-Callback lehnt ab.
                profile: (profile) =>
                    mapKeycloakProfile(profile, KEYCLOAK_CLIENT_ID) as AuthJsUser,
            }),
        ];
    }

    return [];
}

const providers = buildProviders();

// Im none-Modus ist "kein Provider" der Zweck der Übung, sonst ein
// Konfigurationsfehler — laut warnen, statt still auszusperren.
if (providers.length === 0 && !isAuthDisabled()) {
    console.warn(
        `[auth] AUTH_MODE='${AUTH_MODE}' registriert keinen Login-Provider — kein Login möglich. ` +
            `Unterstützt werden 'local', 'keycloak' und 'none'.`
    );
}

if (isKeycloakAuth()) {
    const missing = (
        ['KEYCLOAK_ISSUER', 'KEYCLOAK_CLIENT_ID', 'KEYCLOAK_CLIENT_SECRET'] as const
    ).filter((name) => !process.env[name]);

    if (missing.length > 0) {
        console.warn(
            `[auth] AUTH_MODE='keycloak', aber ${missing.join(', ')} fehlt/fehlen — ` +
                `der Login wird scheitern.`
        );
    }
}

export const {handlers, auth, signIn, signOut} = NextAuth({
    ...authConfig,
    providers,
});
