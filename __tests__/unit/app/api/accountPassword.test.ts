/**
 * @vitest-environment node
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {NextRequest} from 'next/server';
import type {Session} from 'next-auth';
import {UnauthorizedError} from '@/lib/auth/session';
import {UserServiceError} from '@/lib/mongodb/repositories/UserService';

const {requireSessionMock, changeOwnPasswordMock} = vi.hoisted(() => ({
    requireSessionMock: vi.fn(),
    changeOwnPasswordMock: vi.fn(),
}));

vi.mock('@/lib/auth/session', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/auth/session')>();
    return {...actual, requireSession: requireSessionMock};
});

vi.mock('@/lib/mongodb/repositories/UserService', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/lib/mongodb/repositories/UserService')>();
    return {...actual, userService: {changeOwnPassword: changeOwnPasswordMock}};
});

const {PATCH} = await import('@/app/api/account/password/route');

const SESSION = {
    user: {id: 'u2', name: 'bob', role: 'user'},
    authMode: 'local',
    expires: '2999-01-01T00:00:00.000Z',
} as unknown as Session;

function request(body: unknown): NextRequest {
    return new Request('http://localhost/api/account/password', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: typeof body === 'string' ? body : JSON.stringify(body),
    }) as unknown as NextRequest;
}

describe('PATCH /api/account/password', () => {
    beforeEach(() => {
        requireSessionMock.mockReset().mockResolvedValue(SESSION);
        changeOwnPasswordMock.mockReset().mockResolvedValue(undefined);
    });

    it('changes the password of the user in the session', async () => {
        const response = await PATCH(
            request({currentPassword: 'Str0ng!Passw0rd', newPassword: 'An0ther!Passw0rd'})
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({success: true});
        expect(changeOwnPasswordMock).toHaveBeenCalledWith(
            'u2',
            'Str0ng!Passw0rd',
            'An0ther!Passw0rd'
        );
    });

    it('ignores a user id smuggled in the body and uses the session instead', async () => {
        await PATCH(
            request({
                id: 'someone-else',
                userId: 'someone-else',
                currentPassword: 'Str0ng!Passw0rd',
                newPassword: 'An0ther!Passw0rd',
            })
        );

        expect(changeOwnPasswordMock).toHaveBeenCalledWith(
            'u2',
            'Str0ng!Passw0rd',
            'An0ther!Passw0rd'
        );
    });

    it('returns 401 without a session', async () => {
        requireSessionMock.mockRejectedValue(new UnauthorizedError());

        const response = await PATCH(
            request({currentPassword: 'Str0ng!Passw0rd', newPassword: 'An0ther!Passw0rd'})
        );

        expect(response.status).toBe(401);
        expect(changeOwnPasswordMock).not.toHaveBeenCalled();
    });

    it('returns 400 when a field is missing', async () => {
        const response = await PATCH(request({newPassword: 'An0ther!Passw0rd'}));

        expect(response.status).toBe(400);
        expect(changeOwnPasswordMock).not.toHaveBeenCalled();
    });

    it('returns 400 for a malformed body', async () => {
        const response = await PATCH(request('not json'));

        expect(response.status).toBe(400);
        expect(changeOwnPasswordMock).not.toHaveBeenCalled();
    });

    it('surfaces a wrong current password as 400 with the service message', async () => {
        changeOwnPasswordMock.mockRejectedValue(
            new UserServiceError('Current password is incorrect', 'invariant')
        );

        const response = await PATCH(
            request({currentPassword: 'wrong', newPassword: 'An0ther!Passw0rd'})
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: 'Current password is incorrect',
        });
    });

    it('surfaces a policy violation as 400 with the service message', async () => {
        changeOwnPasswordMock.mockRejectedValue(
            new UserServiceError('Password must be 12 to 72 characters', 'policy')
        );

        const response = await PATCH(
            request({currentPassword: 'Str0ng!Passw0rd', newPassword: 'weak'})
        );

        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toEqual({
            error: 'Password must be 12 to 72 characters',
        });
    });
});
