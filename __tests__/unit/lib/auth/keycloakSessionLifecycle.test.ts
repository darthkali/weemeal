/**
 * @vitest-environment node
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const refreshKeycloakSession = vi.hoisted(() => vi.fn());
const endKeycloakSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/auth/keycloakSession', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/keycloakSession')>();
    return {...actual, refreshKeycloakSession, endKeycloakSession};
});

// AUTH_MODE wird beim Import gelesen, also pro Fall frisch laden.
async function loadModule(mode: string) {
    vi.resetModules();
    const previous = process.env.AUTH_MODE;
    process.env.AUTH_MODE = mode;
    try {
        return await import('@/auth.config');
    } finally {
        if (previous === undefined) {
            delete process.env.AUTH_MODE;
        } else {
            process.env.AUTH_MODE = previous;
        }
    }
}

const FUTURE = Math.floor(Date.now() / 1000) + 300;
const PAST = Math.floor(Date.now() / 1000) - 300;

const account = {
    provider: 'keycloak',
    access_token: 'access-1',
    refresh_token: 'refresh-1',
    id_token: 'id-1',
    expires_at: FUTURE,
};

beforeEach(() => {
    refreshKeycloakSession.mockReset();
    endKeycloakSession.mockReset();
    endKeycloakSession.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.resetModules();
});

// Die App-Seite: speichert die Tokens, prüft aber nicht nach.
async function loadConfig(mode: string) {
    return (await loadModule(mode)).default;
}

// Das Gate: dieselbe Konfiguration plus Refresh-Prüfung.
async function loadProxyConfig(mode: string) {
    return (await loadModule(mode)).proxyAuthConfig;
}

describe('jwt callback in keycloak mode', () => {
    it('keeps the Keycloak tokens from the login in the JWT', async () => {
        const config = await loadConfig('keycloak');

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1', email: 'alice@example.com', picture: 'https://…/a.png'},
            user: {id: 'kc-1', name: 'alice', role: 'user'},
            account,
        } as never);

        expect(token).toMatchObject({
            role: 'user',
            authMode: 'keycloak',
            refreshToken: 'refresh-1',
            expiresAt: FUTURE,
        });
        // Weder Access- noch ID-Token gehören ins Cookie, und auch nichts,
        // was die Anwendung nie liest.
        expect(token).not.toHaveProperty('accessToken');
        expect(token).not.toHaveProperty('idToken');
        expect(token).not.toHaveProperty('email');
        expect(token).not.toHaveProperty('picture');
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });

    it('leaves a still-valid access token alone', async () => {
        const config = await loadProxyConfig('keycloak');

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1', role: 'user', authMode: 'keycloak', expiresAt: FUTURE},
        } as never);

        expect(token).toMatchObject({role: 'user'});
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });

    it('refreshes an expired access token and takes over the fresh role', async () => {
        const config = await loadProxyConfig('keycloak');
        refreshKeycloakSession.mockResolvedValue({
            sub: 'kc-1',
            role: 'admin',
            authMode: 'keycloak',
            expiresAt: FUTURE,
        });

        const token = await config.callbacks.jwt({
            token: {
                sub: 'kc-1',
                role: 'user',
                authMode: 'keycloak',
                refreshToken: 'refresh-1',
                expiresAt: PAST,
            },
        } as never);

        expect(refreshKeycloakSession).toHaveBeenCalledOnce();
        expect(token).toMatchObject({role: 'admin'});
    });

    // Auth.js verwirft die Session, wenn der jwt-Callback null liefert — so
    // wird ein gescheiterter Refresh zum Logout statt zum Fehler.
    it('drops the session when the refresh fails', async () => {
        const config = await loadProxyConfig('keycloak');
        refreshKeycloakSession.mockResolvedValue(null);

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1', role: 'user', authMode: 'keycloak', expiresAt: PAST},
        } as never);

        expect(token).toBeNull();
    });

    // Die Refresh-Prüfung entscheidet, wie lange die Session trägt — eine
    // eigene Frist bringt nichts und hängt nur von korrekten Uhren ab.
    it('leaves the session lifetime at the Auth.js default', async () => {
        const config = await loadConfig('keycloak');

        expect(config.session.maxAge).toBeUndefined();
    });
});

describe('jwt callback outside the proxy', () => {
    // Nur der Proxy kann ein erneuertes Token ins Cookie zurückschreiben;
    // liefe die Prüfung auch in auth(), würde dasselbe Refresh-Token zweimal
    // eingelöst.
    it('takes the token as it stands, even when the access token has expired', async () => {
        const config = await loadConfig('keycloak');

        const token = await config.callbacks.jwt({
            token: {
                sub: 'kc-1',
                role: 'user',
                authMode: 'keycloak',
                refreshToken: 'refresh-1',
                expiresAt: PAST,
            },
        } as never);

        expect(token).toMatchObject({role: 'user'});
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });
});

describe('jwt callback outside keycloak mode', () => {
    it('never refreshes in local mode', async () => {
        const config = await loadProxyConfig('local');

        const token = await config.callbacks.jwt({
            token: {sub: 'local-1'},
            user: {id: 'local-1', name: 'alice', role: 'admin'},
        } as never);

        expect(token).toMatchObject({role: 'admin', authMode: 'local'});
        expect(token).not.toHaveProperty('refreshToken');
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });

    it('leaves the local session lifetime at the Auth.js default', async () => {
        const config = await loadConfig('local');

        expect(config.session.maxAge).toBeUndefined();
    });
});

describe('signOut event', () => {
    it('ends the Keycloak session in keycloak mode', async () => {
        const config = await loadConfig('keycloak');

        await config.events.signOut({token: {sub: 'kc-1', refreshToken: 'refresh-1'}} as never);

        expect(endKeycloakSession).toHaveBeenCalledWith('refresh-1');
    });

    it('leaves the identity provider alone in local mode', async () => {
        const config = await loadConfig('local');

        await config.events.signOut({token: {sub: 'local-1'}} as never);

        expect(endKeycloakSession).not.toHaveBeenCalled();
    });

    // Ohne Refresh-Token gibt es nichts zu beenden — der lokale Logout gilt
    // trotzdem. (Dass ein nicht erreichbarer Realm den Logout nicht abwirft,
    // prüft keycloakSession.test.ts am Modul selbst.)
    it('leaves the logout intact without a refresh token', async () => {
        const config = await loadConfig('keycloak');

        await config.events.signOut({token: {sub: 'kc-1'}} as never);

        expect(endKeycloakSession).toHaveBeenCalledWith(undefined);
    });
});
