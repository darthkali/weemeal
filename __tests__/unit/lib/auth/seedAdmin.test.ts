import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import User from '@/lib/mongodb/models/User';
import {userService} from '@/lib/mongodb/repositories/UserService';
import {seedAdmin} from '@/lib/auth/seedAdmin';

const SEED_PW = 'Str0ng!Passw0rd';

describe('seedAdmin', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGODB_URI = mongoServer.getUri();
    }, 60000);

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await userService.listUsers();
        await User.deleteMany({});
        process.env.SEED_ADMIN_USER = 'root';
        process.env.SEED_ADMIN_PASSWORD = SEED_PW;
    });

    afterEach(() => {
        delete process.env.SEED_ADMIN_USER;
        delete process.env.SEED_ADMIN_PASSWORD;
    });

    it('does nothing when not configured', async () => {
        delete process.env.SEED_ADMIN_USER;
        delete process.env.SEED_ADMIN_PASSWORD;

        const result = await seedAdmin();
        expect(result).toEqual({seeded: false, reason: 'not-configured'});
        expect(await User.countDocuments()).toBe(0);
    });

    it('seeds the first admin when none exists', async () => {
        const result = await seedAdmin();
        expect(result).toEqual({seeded: true, username: 'root'});

        const admins = await User.find({role: 'admin'}).exec();
        expect(admins).toHaveLength(1);
        expect(admins[0].username).toBe('root');

        const authed = await userService.authenticate('root', SEED_PW);
        expect(authed?.role).toBe('admin');
    });

    it('is idempotent: a second run is a no-op and does not overwrite', async () => {
        await seedAdmin();
        const first = await User.findOne({username: 'root'}).exec();
        const firstHash = first?.passwordHash;

        const result = await seedAdmin();
        expect(result).toEqual({seeded: false, reason: 'admin-exists'});

        const after = await User.findOne({username: 'root'}).exec();
        expect(await User.countDocuments({role: 'admin'})).toBe(1);
        expect(after?.passwordHash).toBe(firstHash);
    });

    it('does not seed when an admin already exists, even a different one', async () => {
        await userService.createUser('existing-admin', SEED_PW, 'admin');

        const result = await seedAdmin();
        expect(result).toEqual({seeded: false, reason: 'admin-exists'});
        expect(await User.findOne({username: 'root'}).exec()).toBeNull();
    });

    it('does not throw on a weak seed password — returns seed-failed', async () => {
        process.env.SEED_ADMIN_PASSWORD = 'weak';

        const result = await seedAdmin();
        expect(result.seeded).toBe(false);
        if (!result.seeded) {
            expect(result.reason).toBe('seed-failed');
        }
        expect(await User.countDocuments()).toBe(0);
    });
});
