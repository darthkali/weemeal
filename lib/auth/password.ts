import bcrypt from 'bcryptjs';

// Zentrale Passwort-Policy für den local-Auth-Modus. Bewusst als reine
// Funktion, damit sie unabhängig vom UserService testbar ist.
export const PASSWORD_MIN_LENGTH = 12;

// bcrypt hasht nur die ersten 72 Bytes; längere Passwörter würden still
// abgeschnitten. Deshalb hart begrenzen, statt heimlich zu kürzen.
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_POLICY_MESSAGE =
    'Password must be 12 to 72 characters and contain an uppercase letter, ' +
    'a lowercase letter, a digit, and a special character.';

export interface PasswordPolicyResult {
    valid: boolean;
    message?: string;
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
    const longEnough = password.length >= PASSWORD_MIN_LENGTH;
    const shortEnough = password.length <= PASSWORD_MAX_LENGTH;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (longEnough && shortEnough && hasUpper && hasLower && hasDigit && hasSpecial) {
        return {valid: true};
    }

    return {valid: false, message: PASSWORD_POLICY_MESSAGE};
}

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
