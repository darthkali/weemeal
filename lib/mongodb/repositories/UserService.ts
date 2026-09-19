import {connectToDatabase} from '../connection';
import User, {IUserDocument, UserRole} from '../models/User';
import mongoose from 'mongoose';
import {hashPassword, validatePasswordPolicy, verifyPassword} from '@/lib/auth/password';

// Nach außen sichtbarer User — nie mit passwordHash.
export interface PublicUser {
    id: string;
    username: string;
    role: UserRole;
}

// Domänenfehler des UserService. Erlaubt Route-Handlern, Invarianten/Policy als
// 4xx zu mappen statt als 500. `code` steuert den HTTP-Status.
export type UserServiceErrorCode = 'not_found' | 'conflict' | 'invariant' | 'policy';

export class UserServiceError extends Error {
    code: UserServiceErrorCode;

    constructor(message: string, code: UserServiceErrorCode) {
        super(message);
        this.name = 'UserServiceError';
        this.code = code;
    }
}

function toPublicUser(doc: IUserDocument): PublicUser {
    return {
        id: (doc._id as mongoose.Types.ObjectId).toString(),
        username: doc.username,
        role: doc.role,
    };
}

// Für einen unbekannten Username wird trotzdem ein bcrypt-Vergleich gefahren,
// damit die Antwortzeit nicht verrät, ob der Username existiert (kein
// User-Enumeration-Timing-Leak). Lazy einmalig berechnet.
let dummyHashPromise: Promise<string> | null = null;

function getDummyHash(): Promise<string> {
    if (!dummyHashPromise) {
        dummyHashPromise = hashPassword('timing-safe-dummy-password');
    }
    return dummyHashPromise;
}

// MongoDB duplicate-key error code.
function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as {code?: number}).code === 11000
    );
}

/**
 * Kapselt den kompletten User-Lifecycle des local-Auth-Modus samt aller
 * Invarianten. Prior Art: RecipeRepository. Passwörter ausschließlich als
 * bcrypt-Hash; Policy zentral hier erzwungen.
 */
export class UserService {
    private async ensureConnection(): Promise<void> {
        await connectToDatabase();
    }

    private async countAdmins(): Promise<number> {
        return User.countDocuments({role: 'admin'}).exec();
    }

    async authenticate(username: string, password: string): Promise<PublicUser | null> {
        await this.ensureConnection();

        const user = await User.findOne({username: username.trim()}).exec();
        if (!user) {
            // Gleiche Timing-Kosten wie ein echter Vergleich.
            await verifyPassword(password, await getDummyHash());
            return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
            return null;
        }

        return toPublicUser(user);
    }

    async createUser(
        username: string,
        password: string,
        role: UserRole = 'user'
    ): Promise<PublicUser> {
        await this.ensureConnection();

        const policy = validatePasswordPolicy(password);
        if (!policy.valid) {
            throw new UserServiceError(policy.message ?? 'Invalid password', 'policy');
        }

        // Schema trimmt beim Speichern — hier gleich normalisieren, damit
        // Eindeutigkeitsprüfung und späterer Login auf denselben Wert sehen.
        const normalizedUsername = username.trim();

        const existing = await User.findOne({username: normalizedUsername}).exec();
        if (existing) {
            throw new UserServiceError(`Username '${normalizedUsername}' is already taken`, 'conflict');
        }

        try {
            const passwordHash = await hashPassword(password);
            const user = new User({username: normalizedUsername, passwordHash, role});
            const saved = await user.save();
            return toPublicUser(saved);
        } catch (error) {
            // Race gegen den Unique-Index: freundliche Meldung statt E11000.
            if (isDuplicateKeyError(error)) {
                throw new UserServiceError(`Username '${normalizedUsername}' is already taken`, 'conflict');
            }
            throw error;
        }
    }

    async listUsers(): Promise<PublicUser[]> {
        await this.ensureConnection();
        const users = await User.find().sort({username: 1}).exec();
        return users.map(toPublicUser);
    }

    async deleteUser(actorId: string, targetId: string): Promise<void> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            throw new UserServiceError('User not found', 'not_found');
        }

        if (actorId === targetId) {
            throw new UserServiceError('You cannot delete your own account', 'invariant');
        }

        const user = await User.findById(targetId).exec();
        if (!user) {
            throw new UserServiceError('User not found', 'not_found');
        }

        if (user.role === 'admin' && (await this.countAdmins()) <= 1) {
            throw new UserServiceError('Cannot delete the last remaining admin', 'invariant');
        }

        await User.findByIdAndDelete(targetId).exec();
    }

    async setRole(actorId: string, targetId: string, role: UserRole): Promise<PublicUser> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(targetId)) {
            throw new UserServiceError('User not found', 'not_found');
        }

        const user = await User.findById(targetId).exec();
        if (!user) {
            throw new UserServiceError('User not found', 'not_found');
        }

        // Kein State-Change → kein Write, kein updatedAt-Bump.
        if (user.role === role) {
            return toPublicUser(user);
        }

        const demotingToUser = user.role === 'admin' && role === 'user';

        if (demotingToUser && actorId === targetId) {
            throw new UserServiceError('Admins cannot remove their own admin role', 'invariant');
        }

        if (demotingToUser && (await this.countAdmins()) <= 1) {
            throw new UserServiceError('Cannot demote the last remaining admin', 'invariant');
        }

        user.role = role;
        const saved = await user.save();
        return toPublicUser(saved);
    }

    async resetPassword(id: string, newPassword: string): Promise<void> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new UserServiceError('User not found', 'not_found');
        }

        const policy = validatePasswordPolicy(newPassword);
        if (!policy.valid) {
            throw new UserServiceError(policy.message ?? 'Invalid password', 'policy');
        }

        const user = await User.findById(id).exec();
        if (!user) {
            throw new UserServiceError('User not found', 'not_found');
        }

        user.passwordHash = await hashPassword(newPassword);
        await user.save();
    }

    async changeOwnPassword(
        id: string,
        oldPassword: string,
        newPassword: string
    ): Promise<void> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new UserServiceError('User not found', 'not_found');
        }

        const user = await User.findById(id).exec();
        if (!user) {
            throw new UserServiceError('User not found', 'not_found');
        }

        const ok = await verifyPassword(oldPassword, user.passwordHash);
        if (!ok) {
            throw new UserServiceError('Current password is incorrect', 'invariant');
        }

        const policy = validatePasswordPolicy(newPassword);
        if (!policy.valid) {
            throw new UserServiceError(policy.message ?? 'Invalid password', 'policy');
        }

        user.passwordHash = await hashPassword(newPassword);
        await user.save();
    }
}

// Singleton instance
export const userService = new UserService();
