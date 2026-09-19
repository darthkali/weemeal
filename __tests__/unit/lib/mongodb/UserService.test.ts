import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/lib/mongodb/models/User';
import {userService} from '@/lib/mongodb/repositories/UserService';

const VALID_PW = 'Str0ng!Passw0rd';
const VALID_PW_2 = 'An0ther!Passw0rd';

describe('UserService', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        // UserService connects lazily via connectToDatabase(), which reads MONGODB_URI.
        process.env.MONGODB_URI = mongoServer.getUri();
    }, 60000);

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Ensure the connection/indexes exist, then reset between tests.
        await userService.listUsers();
        await User.deleteMany({});
    });

    describe('createUser & authenticate', () => {
        it('creates a user that can then authenticate', async () => {
            const created = await userService.createUser('alice', VALID_PW, 'user');
            expect(created.id).toBeDefined();
            expect(created.username).toBe('alice');
            expect(created.role).toBe('user');

            const authed = await userService.authenticate('alice', VALID_PW);
            expect(authed).not.toBeNull();
            expect(authed?.username).toBe('alice');
            expect(authed?.role).toBe('user');
        });

        it('never exposes a password hash on the returned user', async () => {
            const created = await userService.createUser('alice', VALID_PW);
            expect((created as Record<string, unknown>).passwordHash).toBeUndefined();
        });

        it('stores the password as a bcrypt hash, never plaintext', async () => {
            await userService.createUser('alice', VALID_PW);
            const doc = await User.findOne({username: 'alice'}).exec();
            expect(doc?.passwordHash).toBeDefined();
            expect(doc?.passwordHash).not.toBe(VALID_PW);
            expect(doc?.passwordHash).toMatch(/^\$2[aby]\$/);
        });

        it('rejects authentication with a wrong password', async () => {
            await userService.createUser('alice', VALID_PW);
            const authed = await userService.authenticate('alice', 'WrongPassw0rd!');
            expect(authed).toBeNull();
        });

        it('rejects authentication for an unknown user', async () => {
            const authed = await userService.authenticate('ghost', VALID_PW);
            expect(authed).toBeNull();
        });

        it('rejects a password that violates the policy', async () => {
            await expect(userService.createUser('alice', 'weak')).rejects.toThrow();
        });

        it('rejects a duplicate username', async () => {
            await userService.createUser('alice', VALID_PW);
            await expect(userService.createUser('alice', VALID_PW_2)).rejects.toThrow();
        });

        it('normalizes whitespace so trimmed usernames stay consistent', async () => {
            await userService.createUser('alice', VALID_PW);

            // Duplicate check sees the trimmed value.
            await expect(
                userService.createUser('  alice  ', VALID_PW_2)
            ).rejects.toThrow();

            // Login tolerates stray surrounding whitespace.
            expect(await userService.authenticate('  alice  ', VALID_PW)).not.toBeNull();
        });
    });

    describe('listUsers', () => {
        it('lists users sorted by username', async () => {
            await userService.createUser('charlie', VALID_PW);
            await userService.createUser('alice', VALID_PW);
            await userService.createUser('bob', VALID_PW);

            const users = await userService.listUsers();
            expect(users.map((u) => u.username)).toEqual(['alice', 'bob', 'charlie']);
        });
    });

    describe('deleteUser', () => {
        it('deletes a normal user', async () => {
            const admin = await userService.createUser('admin', VALID_PW, 'admin');
            const user = await userService.createUser('bob', VALID_PW, 'user');

            await userService.deleteUser(user.id);

            const remaining = await userService.listUsers();
            expect(remaining.map((u) => u.username)).toEqual([admin.username]);
        });

        it('refuses to delete the last remaining admin', async () => {
            const admin = await userService.createUser('admin', VALID_PW, 'admin');
            await expect(userService.deleteUser(admin.id)).rejects.toThrow();
        });

        it('allows deleting an admin when another admin remains', async () => {
            const admin1 = await userService.createUser('admin1', VALID_PW, 'admin');
            await userService.createUser('admin2', VALID_PW, 'admin');

            await expect(userService.deleteUser(admin1.id)).resolves.toBeUndefined();
        });
    });

    describe('setRole', () => {
        it('promotes a user to admin', async () => {
            await userService.createUser('admin', VALID_PW, 'admin');
            const bob = await userService.createUser('bob', VALID_PW, 'user');

            const updated = await userService.setRole('admin-id', bob.id, 'admin');
            expect(updated.role).toBe('admin');
        });

        it('demotes an admin to user when another admin remains', async () => {
            const admin1 = await userService.createUser('admin1', VALID_PW, 'admin');
            const admin2 = await userService.createUser('admin2', VALID_PW, 'admin');

            const updated = await userService.setRole(admin1.id, admin2.id, 'user');
            expect(updated.role).toBe('user');
        });

        it('refuses to demote the last remaining admin', async () => {
            const admin = await userService.createUser('admin', VALID_PW, 'admin');
            const otherActor = await userService.createUser('bob', VALID_PW, 'user');

            await expect(
                userService.setRole(otherActor.id, admin.id, 'user')
            ).rejects.toThrow();
        });

        it('refuses to let an admin remove their own admin role', async () => {
            const admin1 = await userService.createUser('admin1', VALID_PW, 'admin');
            await userService.createUser('admin2', VALID_PW, 'admin');

            await expect(
                userService.setRole(admin1.id, admin1.id, 'user')
            ).rejects.toThrow();
        });
    });

    describe('resetPassword', () => {
        it('resets a user password (old fails, new works)', async () => {
            const bob = await userService.createUser('bob', VALID_PW, 'user');

            await userService.resetPassword(bob.id, VALID_PW_2);

            expect(await userService.authenticate('bob', VALID_PW)).toBeNull();
            expect(await userService.authenticate('bob', VALID_PW_2)).not.toBeNull();
        });

        it('rejects a new password that violates the policy', async () => {
            const bob = await userService.createUser('bob', VALID_PW, 'user');
            await expect(userService.resetPassword(bob.id, 'weak')).rejects.toThrow();
        });
    });

    describe('changeOwnPassword', () => {
        it('changes the password with the correct old password', async () => {
            const bob = await userService.createUser('bob', VALID_PW, 'user');

            await userService.changeOwnPassword(bob.id, VALID_PW, VALID_PW_2);

            expect(await userService.authenticate('bob', VALID_PW_2)).not.toBeNull();
        });

        it('rejects a change with an incorrect old password', async () => {
            const bob = await userService.createUser('bob', VALID_PW, 'user');
            await expect(
                userService.changeOwnPassword(bob.id, 'WrongOld!123', VALID_PW_2)
            ).rejects.toThrow();
        });

        it('rejects a new password that violates the policy', async () => {
            const bob = await userService.createUser('bob', VALID_PW, 'user');
            await expect(
                userService.changeOwnPassword(bob.id, VALID_PW, 'weak')
            ).rejects.toThrow();
        });
    });
});
