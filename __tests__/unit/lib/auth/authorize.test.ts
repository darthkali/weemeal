import {describe, expect, it, vi} from 'vitest';
import {authorizeCredentials} from '@/lib/auth/authorize';
import type {PublicUser} from '@/lib/mongodb/repositories/UserService';

const ADMIN: PublicUser = {id: 'u1', username: 'root', role: 'admin'};

describe('authorizeCredentials', () => {
    it('returns the user (id/name/role) on valid credentials', async () => {
        const authenticate = vi.fn().mockResolvedValue(ADMIN);

        const result = await authorizeCredentials(
            {username: 'root', password: 'Str0ng!Passw0rd'},
            authenticate
        );

        expect(result).toEqual({id: 'u1', name: 'root', role: 'admin'});
        expect(authenticate).toHaveBeenCalledWith('root', 'Str0ng!Passw0rd');
    });

    it('returns null when authentication fails', async () => {
        const authenticate = vi.fn().mockResolvedValue(null);

        const result = await authorizeCredentials(
            {username: 'root', password: 'wrong'},
            authenticate
        );

        expect(result).toBeNull();
    });

    it('returns null and does not authenticate when fields are missing', async () => {
        const authenticate = vi.fn();

        expect(await authorizeCredentials({username: 'root'}, authenticate)).toBeNull();
        expect(await authorizeCredentials({password: 'x'}, authenticate)).toBeNull();
        expect(await authorizeCredentials({}, authenticate)).toBeNull();
        expect(authenticate).not.toHaveBeenCalled();
    });

    it('returns null for non-string credential values', async () => {
        const authenticate = vi.fn();

        const result = await authorizeCredentials(
            {username: 123, password: {}},
            authenticate
        );

        expect(result).toBeNull();
        expect(authenticate).not.toHaveBeenCalled();
    });

    it('returns null for empty strings', async () => {
        const authenticate = vi.fn();
        expect(
            await authorizeCredentials({username: '', password: ''}, authenticate)
        ).toBeNull();
        expect(authenticate).not.toHaveBeenCalled();
    });
});
