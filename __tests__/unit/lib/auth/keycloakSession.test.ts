/**
 * @vitest-environment node
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    endKeycloakSession,
    isAccessTokenExpired,
    refreshKeycloakSession,
} from '@/lib/auth/keycloakSession';
import {resetKeycloakDiscoveryCache} from '@/lib/auth/keycloakDiscovery';

const ISSUER = 'https://kc.example.com/realms/weemeal';
const TOKEN_ENDPOINT = `${ISSUER}/protocol/openid-connect/token`;
const END_SESSION_ENDPOINT = `${ISSUER}/protocol/openid-connect/logout`;
const CLIENT_ID = 'weemeal';
const CLIENT_SECRET = 's3cret';

// Ein Access-Token ist ein JWT: Header.Payload.Signature. Für den Refresh
// zählt nur die Payload, die Signatur prüft Keycloak selbst.
function accessToken(claims: Record<string, unknown>): string {
    const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
    return `header.${payload}.signature`;
}

function tokenWithRoles(...roles: string[]): string {
    return accessToken({
        sub: 'kc-1',
        resource_access: {[CLIENT_ID]: {roles}},
    });
}

function jsonResponse(body: unknown, ok = true) {
    return {
        ok,
        status: ok ? 200 : 400,
        json: async () => body,
        text: async () => JSON.stringify(body),
    } as Response;
}

function discovery() {
    return jsonResponse({
        token_endpoint: TOKEN_ENDPOINT,
        end_session_endpoint: END_SESSION_ENDPOINT,
    });
}

const deps = (fetchImpl: typeof fetch) => ({
    issuer: ISSUER,
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    fetchImpl,
});

const expiredToken = {
    role: 'user' as const,
    authMode: 'keycloak',
    refreshToken: 'refresh-1',
    idToken: 'id-1',
    expiresAt: 1_000,
};

beforeEach(() => {
    resetKeycloakDiscoveryCache();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('isAccessTokenExpired', () => {
    it('is false while the token still lives', () => {
        expect(isAccessTokenExpired(2_000, 1_000_000)).toBe(false);
    });

    it('is true once the expiry has passed', () => {
        expect(isAccessTokenExpired(1_000, 2_000_000)).toBe(true);
    });

    // Ohne Ablaufzeitpunkt wissen wir nichts über die Keycloak-Session — dann
    // lieber refreshen als blind weiterlaufen.
    it('treats a missing expiry as expired', () => {
        expect(isAccessTokenExpired(undefined, 1_000)).toBe(true);
    });
});

describe('refreshKeycloakSession', () => {
    const freshIdToken = tokenWithRoles('weemeal-user');

    it('exchanges the refresh token and keeps the session alive', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({
                    access_token: tokenWithRoles('weemeal-user'),
                    refresh_token: 'refresh-2',
                    id_token: freshIdToken,
                    expires_in: 300,
                })
            );

        const refreshed = await refreshKeycloakSession(expiredToken, {
            ...deps(fetchImpl as unknown as typeof fetch),
            now: 1_000_000,
        });

        expect(refreshed).toMatchObject({
            role: 'user',
            authMode: 'keycloak',
            refreshToken: 'refresh-2',
            idToken: freshIdToken,
            expiresAt: 1_300,
        });

        const [url, init] = (fetchImpl.mock.calls[1] ?? []) as [string, RequestInit];
        expect(url).toBe(TOKEN_ENDPOINT);
        // Ein hängender Keycloak darf den Request nicht aufhalten.
        expect(init.signal).toBeInstanceOf(AbortSignal);
        const body = new URLSearchParams(init.body as string);
        expect(Object.fromEntries(body)).toEqual({
            grant_type: 'refresh_token',
            refresh_token: 'refresh-1',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
        });
    });

    // Der Realm mappt die Rollen ins ID-Token (so richtet der README den
    // Client ein); das Access-Token kann sie dann nicht tragen.
    it('reads the role from the fresh id token', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({
                    access_token: accessToken({sub: 'kc-1'}),
                    id_token: tokenWithRoles('weemeal-user', 'weemeal-admin'),
                    expires_in: 300,
                })
            );

        const refreshed = await refreshKeycloakSession(
            expiredToken,
            deps(fetchImpl as unknown as typeof fetch)
        );

        expect(refreshed?.role).toBe('admin');
    });

    // Ohne frisches ID-Token bleibt nur das Access-Token.
    it('falls back to the fresh access token when the refresh returns no id token', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({
                    access_token: tokenWithRoles('weemeal-user', 'weemeal-admin'),
                    expires_in: 300,
                })
            );

        const refreshed = await refreshKeycloakSession(expiredToken, {
            ...deps(fetchImpl as unknown as typeof fetch),
            now: 1_000_000,
        });

        expect(refreshed?.role).toBe('admin');
    });

    // Entzug von weemeal-user in Keycloak: der Refresh gelingt, aber die
    // Role löst nicht mehr auf — der Zutritt endet trotzdem.
    it('drops the session when the fresh token grants no WeeMeal role', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({access_token: tokenWithRoles('some-other-role'), expires_in: 300})
            );

        await expect(
            refreshKeycloakSession(expiredToken, deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeNull();
    });

    // Der Entzug steht im ID-Token — ein Access-Token, das die Rollen noch
    // trägt, darf ihn nicht überstimmen.
    it('drops the session when the fresh id token grants no WeeMeal role', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({
                    access_token: tokenWithRoles('weemeal-user'),
                    id_token: tokenWithRoles('some-other-role'),
                    expires_in: 300,
                })
            );

        await expect(
            refreshKeycloakSession(expiredToken, deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeNull();
    });

    it('drops the session when Keycloak rejects the refresh token', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(jsonResponse({error: 'invalid_grant'}, false));

        await expect(
            refreshKeycloakSession(expiredToken, deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeNull();
    });

    it('drops the session when the token endpoint does not answer in time', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockRejectedValueOnce(
                Object.assign(new Error('The operation was aborted due to timeout'), {
                    name: 'TimeoutError',
                })
            );

        await expect(
            refreshKeycloakSession(expiredToken, deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeNull();
    });

    it('drops the session when Keycloak is unreachable', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

        await expect(
            refreshKeycloakSession(expiredToken, deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeNull();
    });

    it('drops the session without a refresh token', async () => {
        const fetchImpl = vi.fn();

        await expect(
            refreshKeycloakSession(
                {...expiredToken, refreshToken: undefined},
                deps(fetchImpl as unknown as typeof fetch)
            )
        ).resolves.toBeNull();
        expect(fetchImpl).not.toHaveBeenCalled();
    });
});

describe('refreshKeycloakSession without expires_in', () => {
    it('takes the expiry from the exp claim of the fresh token', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(
                jsonResponse({
                    access_token: accessToken({
                        sub: 'kc-1',
                        exp: 4_242,
                        resource_access: {[CLIENT_ID]: {roles: ['weemeal-user']}},
                    }),
                })
            );

        const refreshed = await refreshKeycloakSession(
            expiredToken,
            deps(fetchImpl as unknown as typeof fetch)
        );

        expect(refreshed?.expiresAt).toBe(4_242);
    });
});

describe('endKeycloakSession', () => {
    it('calls the end-session endpoint with the id token as a hint', async () => {
        const fetchImpl = vi.fn().mockResolvedValueOnce(discovery()).mockResolvedValueOnce(
            jsonResponse({})
        );

        await endKeycloakSession('id-1', deps(fetchImpl as unknown as typeof fetch));

        const [url] = (fetchImpl.mock.calls[1] ?? []) as [string];
        const called = new URL(url);
        expect(called.origin + called.pathname).toBe(END_SESSION_ENDPOINT);
        expect(called.searchParams.get('id_token_hint')).toBe('id-1');
        expect(called.searchParams.get('client_id')).toBe(CLIENT_ID);
    });

    it('warns when Keycloak refuses the id token hint', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockResolvedValueOnce(jsonResponse({}, false));

        await endKeycloakSession('id-1', deps(fetchImpl as unknown as typeof fetch));

        expect(warn).toHaveBeenCalledWith(expect.stringContaining('Keycloak-Logout abgelehnt'));
    });

    it('does nothing without an id token', async () => {
        const fetchImpl = vi.fn();

        await endKeycloakSession(undefined, deps(fetchImpl as unknown as typeof fetch));

        expect(fetchImpl).not.toHaveBeenCalled();
    });

    // Der WeeMeal-Logout darf nicht scheitern, nur weil Keycloak gerade nicht
    // erreichbar ist — das App-Cookie muss trotzdem weg.
    it('swallows a failing request', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(discovery())
            .mockRejectedValueOnce(new Error('connect ECONNREFUSED'));

        await expect(
            endKeycloakSession('id-1', deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeUndefined();
    });

    it('swallows a realm without an end-session endpoint', async () => {
        const fetchImpl = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse({token_endpoint: TOKEN_ENDPOINT}));

        await expect(
            endKeycloakSession('id-1', deps(fetchImpl as unknown as typeof fetch))
        ).resolves.toBeUndefined();
        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });
});
