'use client';

import {useState} from 'react';
import {PASSWORD_POLICY_HINT, validatePasswordPolicy} from '@/lib/auth/passwordPolicy';

async function readError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return typeof data?.error === 'string' ? data.error : 'Aktion fehlgeschlagen';
    } catch {
        return 'Aktion fehlgeschlagen';
    }
}

/**
 * Ändert das Passwort des eingeloggten Users. Die Ziel-Identität kommt
 * serverseitig aus der Session — das Formular schickt nur die beiden
 * Passwörter. Die Policy-Vorprüfung hier ist reine Bequemlichkeit; verbindlich
 * ist die Prüfung im UserService.
 */
export default function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    function validate(): string | null {
        if (newPassword !== confirmPassword) {
            return 'Die neuen Passwörter stimmen nicht überein';
        }
        if (!validatePasswordPolicy(newPassword).valid) {
            return PASSWORD_POLICY_HINT;
        }
        return null;
    }

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setSuccess(false);

        const localError = validate();
        if (localError) {
            setError(localError);
            return;
        }

        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/account/password', {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({currentPassword, newPassword}),
            });

            if (!response.ok) {
                setError(await readError(response));
                return;
            }

            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setSuccess(true);
        } catch {
            setError('Netzwerkfehler – bitte erneut versuchen');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-1">
                <label htmlFor="currentPassword" className="text-sm font-medium text-text-dark">
                    Aktuelles Passwort
                </label>
                <input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="input w-full"
                />
            </div>

            <div className="space-y-1">
                <label htmlFor="newPassword" className="text-sm font-medium text-text-dark">
                    Neues Passwort
                </label>
                <input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    aria-describedby="passwordPolicyHint"
                    className="input w-full"
                />
                <p id="passwordPolicyHint" className="text-xs text-text-muted">
                    {PASSWORD_POLICY_HINT}
                </p>
            </div>

            <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-text-dark">
                    Neues Passwort bestätigen
                </label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input w-full"
                />
            </div>

            {error && (
                <p className="text-sm text-error" role="alert">
                    {error}
                </p>
            )}

            {success && (
                <p className="text-sm text-primary" role="status">
                    Passwort geändert.
                </p>
            )}

            <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                {isSubmitting ? 'Speichern…' : 'Passwort ändern'}
            </button>
        </form>
    );
}
