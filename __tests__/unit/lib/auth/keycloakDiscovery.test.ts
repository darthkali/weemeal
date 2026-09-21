/**
 * @vitest-environment node
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    discoverKeycloakEndpoints,
    resetKeycloakDiscoveryCache,
} from '@/lib/auth/keycloakDiscovery';

const ISSUER = 'https://kc.example.com/realms/weemeal';

function discoveryResponse(body: Record<string, unknown>, ok = true) {
    return {
        ok,
        status: ok ? 200 : 500,
        json: async () => body,
    } as Response;
}

afterEach(() => {
    resetKeycloakDiscoveryCache();
    vi.restoreAllMocks();
});

describe('discoverKeycloakEndpoints', () => {
    it('reads the token and end-session endpoints from the discovery document', async () => {
        const fetchImpl = vi.fn(async () =>
            discoveryResponse({
                token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
                end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
            })
        );

        const endpoints = await discoverKeycloakEndpoints(ISSUER, fetchImpl);

        expect(fetchImpl).toHaveBeenCalledWith(
            `${ISSUER}/.well-known/openid-configuration`,
            // Ein hängender Keycloak darf den Request nicht aufhalten.
            expect.objectContaining({signal: expect.any(AbortSignal)})
        );
        expect(endpoints).toEqual({
            tokenEndpoint: `${ISSUER}/protocol/openid-connect/token`,
            endSessionEndpoint: `${ISSUER}/protocol/openid-connect/logout`,
        });
    });

    it('fetches the document only once per issuer', async () => {
        const fetchImpl = vi.fn(async () =>
            discoveryResponse({
                token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
                end_session_endpoint: `${ISSUER}/protocol/openid-connect/logout`,
            })
        );

        await discoverKeycloakEndpoints(ISSUER, fetchImpl);
        await discoverKeycloakEndpoints(ISSUER, fetchImpl);

        expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it('returns null without an issuer', async () => {
        const fetchImpl = vi.fn();

        await expect(discoverKeycloakEndpoints(undefined, fetchImpl)).resolves.toBeNull();
        expect(fetchImpl).not.toHaveBeenCalled();
    });

    it('returns null when the document lacks a token endpoint', async () => {
        const fetchImpl = vi.fn(async () => discoveryResponse({issuer: ISSUER}));

        await expect(discoverKeycloakEndpoints(ISSUER, fetchImpl)).resolves.toBeNull();
    });

    it('returns null on a failed request and retries on the next call', async () => {
        const fetchImpl = vi
            .fn()
            .mockRejectedValueOnce(new Error('connect ECONNREFUSED'))
            .mockResolvedValueOnce(
                discoveryResponse({
                    token_endpoint: `${ISSUER}/protocol/openid-connect/token`,
                })
            );

        await expect(discoverKeycloakEndpoints(ISSUER, fetchImpl)).resolves.toBeNull();
        await expect(discoverKeycloakEndpoints(ISSUER, fetchImpl)).resolves.toMatchObject({
            tokenEndpoint: `${ISSUER}/protocol/openid-connect/token`,
            endSessionEndpoint: null,
        });
    });
});
