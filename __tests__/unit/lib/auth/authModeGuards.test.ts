/**
 * @vitest-environment node
 */
import {describe, expect, it, vi} from 'vitest';
import type {Session} from 'next-auth';

// AUTH_MODE wird beim Import von auth.config aus der Env gelesen; für die
// Modus-Varianten wird das Modul deshalb pro Block frisch gemockt.
async function loadGuards(mode: string) {
    vi.resetModules();
    vi.doMock('@/auth.config', async (importOriginal) => {
        const actual = await importOriginal<typeof import('@/auth.config')>();
        return {
            ...actual,
            AUTH_MODE: mode,
            isAuthDisabled: () => mode === 'none',
            isLocalAuth: () => mode === 'local',
        };
    });
    return import('@/lib/auth/session');
}

const SESSION = {
    user: {id: 'u1', name: 'root', role: 'admin'},
    authMode: 'local',
    expires: '2999-01-01T00:00:00.000Z',
} as unknown as Session;

describe('sessionGuard in auth mode none', () => {
    it('lets every request through without asking for a session', async () => {
        const {sessionGuard} = await loadGuards('none');
        const getSession = vi.fn();

        await expect(sessionGuard(getSession)).resolves.toBeNull();
        expect(getSession).not.toHaveBeenCalled();
    });
});

describe('sessionGuard in auth mode local', () => {
    it('still rejects a request without a session', async () => {
        const {sessionGuard} = await loadGuards('local');

        const result = await sessionGuard(async () => null);
        expect(result?.status).toBe(401);
    });

    it('still lets a signed-in request through', async () => {
        const {sessionGuard} = await loadGuards('local');

        await expect(sessionGuard(async () => SESSION)).resolves.toBeNull();
    });
});

describe('localAuthGuard', () => {
    it('lets the route run in local mode', async () => {
        const {localAuthGuard} = await loadGuards('local');
        expect(localAuthGuard()).toBeNull();
    });

    it('hides the route in keycloak mode', async () => {
        const {localAuthGuard} = await loadGuards('keycloak');
        expect(localAuthGuard()?.status).toBe(404);
    });

    it('hides the route in none mode', async () => {
        const {localAuthGuard} = await loadGuards('none');
        expect(localAuthGuard()?.status).toBe(404);
    });
});
