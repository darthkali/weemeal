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
async function loadConfig(mode: string) {
    vi.resetModules();
    const previous = process.env.AUTH_MODE;
    process.env.AUTH_MODE = mode;
    try {
        return (await import('@/auth.config')).default;
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

describe('jwt callback in keycloak mode', () => {
    it('keeps the Keycloak tokens from the login in the JWT', async () => {
        const config = await loadConfig('keycloak');

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1'},
            user: {id: 'kc-1', name: 'alice', role: 'user'},
            account,
        } as never);

        expect(token).toMatchObject({
            role: 'user',
            authMode: 'keycloak',
            accessToken: 'access-1',
            refreshToken: 'refresh-1',
            idToken: 'id-1',
            expiresAt: FUTURE,
        });
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });

    it('leaves a still-valid access token alone', async () => {
        const config = await loadConfig('keycloak');

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1', role: 'user', authMode: 'keycloak', expiresAt: FUTURE},
        } as never);

        expect(token).toMatchObject({role: 'user'});
        expect(refreshKeycloakSession).not.toHaveBeenCalled();
    });

    it('refreshes an expired access token and takes over the fresh role', async () => {
        const config = await loadConfig('keycloak');
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
        const config = await loadConfig('keycloak');
        refreshKeycloakSession.mockResolvedValue(null);

        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1', role: 'user', authMode: 'keycloak', expiresAt: PAST},
        } as never);

        expect(token).toBeNull();
    });

    it('shortens the session lifetime to the access-token window', async () => {
        const config = await loadConfig('keycloak');

        expect(config.session.maxAge).toBe(60 * 60);
    });
});

describe('jwt callback outside keycloak mode', () => {
    it('never refreshes in local mode', async () => {
        const config = await loadConfig('local');

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

        await config.events.signOut({token: {sub: 'kc-1', idToken: 'id-1'}} as never);

        expect(endKeycloakSession).toHaveBeenCalledWith('id-1');
    });

    it('leaves the identity provider alone in local mode', async () => {
        const config = await loadConfig('local');

        await config.events.signOut({token: {sub: 'local-1'}} as never);

        expect(endKeycloakSession).not.toHaveBeenCalled();
    });

    // Ohne id_token gibt es nichts zu beenden — der lokale Logout gilt
    // trotzdem. (Dass ein nicht erreichbarer Realm den Logout nicht abwirft,
    // prüft keycloakSession.test.ts am Modul selbst.)
    it('leaves the logout intact without an id token', async () => {
        const config = await loadConfig('keycloak');

        await config.events.signOut({token: {sub: 'kc-1'}} as never);

        expect(endKeycloakSession).toHaveBeenCalledWith(undefined);
    });
});
