import {describe, expect, it, vi} from 'vitest';
import type {Session} from 'next-auth';
import {requireSession, sessionGuard, UnauthorizedError} from '@/lib/auth/session';

const SESSION = {
    user: {id: 'u1', name: 'root', role: 'admin'},
    authMode: 'local',
    expires: '2999-01-01T00:00:00.000Z',
} as unknown as Session;

describe('requireSession', () => {
    it('returns the session when one exists', async () => {
        const session = await requireSession(async () => SESSION);
        expect(session.user.id).toBe('u1');
    });

    it('throws UnauthorizedError when there is no session', async () => {
        await expect(requireSession(async () => null)).rejects.toBeInstanceOf(
            UnauthorizedError
        );
    });

    it('throws UnauthorizedError when the session has no user', async () => {
        const noUser = {expires: '2999-01-01T00:00:00.000Z'} as unknown as Session;
        await expect(requireSession(async () => noUser)).rejects.toBeInstanceOf(
            UnauthorizedError
        );
    });
});

describe('sessionGuard', () => {
    it('returns null when a session exists', async () => {
        const result = await sessionGuard(async () => SESSION);
        expect(result).toBeNull();
    });

    it('returns a 401 response when there is no session', async () => {
        const result = await sessionGuard(async () => null);
        expect(result).not.toBeNull();
        expect(result?.status).toBe(401);
        await expect(result?.json()).resolves.toEqual({error: 'Unauthorized'});
    });

    it('rethrows non-auth errors instead of masking them as 401', async () => {
        const boom = new Error('DB down');
        await expect(
            sessionGuard(async () => {
                throw boom;
            })
        ).rejects.toBe(boom);
    });
});
