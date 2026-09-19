import {connectToDatabase} from '@/lib/mongodb/connection';
import User from '@/lib/mongodb/models/User';
import {userService} from '@/lib/mongodb/repositories/UserService';

export type SeedResult =
    | {seeded: true; username: string}
    | {seeded: false; reason: 'not-configured' | 'admin-exists' | 'seed-failed'; message?: string};

/**
 * Legt beim Start den ersten Admin aus SEED_ADMIN_USER / SEED_ADMIN_PASSWORD
 * an — aber nur, wenn noch kein Admin existiert. Idempotent: bei erneutem
 * Aufruf (bereits vorhandener Admin) ein No-op, ohne Überschreibung.
 *
 * Wirft nie: eine schwache Seed-Config oder ein paralleler Start (Race auf den
 * ersten Admin) darf den Boot nicht abschießen, sondern liefert 'seed-failed'.
 */
export async function seedAdmin(): Promise<SeedResult> {
    const username = process.env.SEED_ADMIN_USER;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!username || !password) {
        return {seeded: false, reason: 'not-configured'};
    }

    await connectToDatabase();

    const existingAdmin = await User.exists({role: 'admin'});
    if (existingAdmin) {
        return {seeded: false, reason: 'admin-exists'};
    }

    try {
        await userService.createUser(username, password, 'admin');
        return {seeded: true, username};
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {seeded: false, reason: 'seed-failed', message};
    }
}
