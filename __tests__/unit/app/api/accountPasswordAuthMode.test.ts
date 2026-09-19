/**
 * @vitest-environment node
 */
import {describe, expect, it, vi} from 'vitest';
import type {NextRequest} from 'next/server';
import type {Session} from 'next-auth';

const {requireSessionMock, changeOwnPasswordMock} = vi.hoisted(() => ({
    requireSessionMock: vi.fn(),
    changeOwnPasswordMock: vi.fn(),
}));

// Im keycloak-Modus verwaltet Keycloak die Passwörter — die Route darf dort
// nicht greifen, auch wenn eine gültige Session existiert.
vi.mock('@/auth.config', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/auth.config')>();
    return {...actual, AUTH_MODE: 'keycloak'};
});

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

requireSessionMock.mockResolvedValue({
    user: {id: 'u2', name: 'bob', role: 'user'},
    authMode: 'keycloak',
    expires: '2999-01-01T00:00:00.000Z',
} as unknown as Session);

describe('PATCH /api/account/password in keycloak mode', () => {
    it('refuses the change and never touches the UserService', async () => {
        const response = await PATCH(
            new Request('http://localhost/api/account/password', {
                method: 'PATCH',
                body: JSON.stringify({
                    currentPassword: 'Str0ng!Passw0rd',
                    newPassword: 'An0ther!Passw0rd',
                }),
            }) as unknown as NextRequest
        );

        expect(response.status).toBe(404);
        expect(changeOwnPasswordMock).not.toHaveBeenCalled();
    });
});
