/**
 * @vitest-environment node
 */
import {afterEach, describe, expect, it, vi} from 'vitest';

// AUTH_MODE und die Keycloak-Env werden beim Import gelesen, also pro Fall
// frisch laden.
async function loadConfig(env: Record<string, string | undefined>) {
    vi.resetModules();
    const previous: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(env)) {
        previous[key] = process.env[key];
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
    try {
        return (await import('@/auth.config')).default;
    } finally {
        for (const [key, value] of Object.entries(previous)) {
            if (value === undefined) {
                delete process.env[key];
            } else {
                process.env[key] = value;
            }
        }
    }
}

type SignInArgs = Parameters<NonNullable<
    Awaited<ReturnType<typeof loadConfig>>['callbacks']
>['signIn']>[0];

function signInArgs(role: unknown): SignInArgs {
    return {user: {id: 'kc-1', name: 'alice', role}} as unknown as SignInArgs;
}

afterEach(() => {
    vi.resetModules();
});

describe('signIn callback in keycloak mode', () => {
    it('lets a user with a resolved role in', async () => {
        const config = await loadConfig({AUTH_MODE: 'keycloak'});

        await expect(config.callbacks.signIn(signInArgs('user'))).resolves.toBe(true);
        await expect(config.callbacks.signIn(signInArgs('admin'))).resolves.toBe(true);
    });

    it('refuses a token that granted no WeeMeal role', async () => {
        const config = await loadConfig({AUTH_MODE: 'keycloak'});

        await expect(config.callbacks.signIn(signInArgs(null))).resolves.toBe(false);
        await expect(config.callbacks.signIn(signInArgs(undefined))).resolves.toBe(false);
    });
});

describe('signIn callback in local mode', () => {
    it('does not gate on the claim-derived role', async () => {
        const config = await loadConfig({AUTH_MODE: 'local'});

        // Im local-Modus entscheidet der Credentials-Provider; ein fehlendes
        // role-Feld darf hier nichts blockieren.
        await expect(config.callbacks.signIn(signInArgs(undefined))).resolves.toBe(true);
    });
});

describe('session carries the role resolved from the claim', () => {
    it('puts the role and the auth mode into the token, then into the session', async () => {
        const config = await loadConfig({AUTH_MODE: 'keycloak'});

        // So reicht Auth.js den vom profile-Mapper gebauten User durch.
        const token = await config.callbacks.jwt({
            token: {sub: 'kc-1'},
            user: {id: 'kc-1', name: 'alice', role: 'admin'},
        } as never);

        expect(token).toMatchObject({role: 'admin', authMode: 'keycloak'});

        const session = await config.callbacks.session({
            session: {user: {id: '', name: 'alice'}},
            token,
        } as never);

        expect(session).toMatchObject({
            user: {id: 'kc-1', role: 'admin'},
            authMode: 'keycloak',
        });
    });
});
