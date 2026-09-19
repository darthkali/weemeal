// Zentrale Passwort-Policy für den local-Auth-Modus. Bewusst als reine
// Funktion ohne bcrypt-Abhängigkeit, damit sie unabhängig vom UserService
// testbar ist und auch im Client-Bundle (Formular-Vorprüfung) landen darf.
export const PASSWORD_MIN_LENGTH = 12;

// bcrypt hasht nur die ersten 72 Bytes; längere Passwörter würden still
// abgeschnitten. Deshalb hart begrenzen, statt heimlich zu kürzen.
export const PASSWORD_MAX_LENGTH = 72;

export const PASSWORD_POLICY_MESSAGE =
    'Password must be 12 to 72 characters and contain an uppercase letter, ' +
    'a lowercase letter, a digit, and a special character.';

// Gleiche Regel, für die deutschsprachige Oberfläche formuliert.
export const PASSWORD_POLICY_HINT =
    'Mindestens 12 Zeichen (max. 72), mit Groß- und Kleinbuchstabe, Ziffer und Sonderzeichen.';

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
