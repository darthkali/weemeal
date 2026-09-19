import bcrypt from 'bcryptjs';

// Nur bcrypt-Kram. Die Passwort-Policy lebt bcrypt-frei in
// './passwordPolicy', damit sie auch im Client-Bundle landen darf.

const BCRYPT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
    password: string,
    passwordHash: string
): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}
