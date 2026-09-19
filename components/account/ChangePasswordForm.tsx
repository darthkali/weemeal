'use client';

import {useState} from 'react';
import PasswordInput from '@/components/ui/PasswordInput';
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
            <PasswordInput
                id="currentPassword"
                label="Aktuelles Passwort"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                required
            />

            <div className="space-y-1">
                <PasswordInput
                    id="newPassword"
                    label="Neues Passwort"
                    value={newPassword}
                    onChange={setNewPassword}
                    autoComplete="new-password"
                    required
                    describedBy="passwordPolicyHint"
                />
                <p id="passwordPolicyHint" className="text-xs text-text-muted">
                    {PASSWORD_POLICY_HINT}
                </p>
            </div>

            <PasswordInput
                id="confirmPassword"
                label="Neues Passwort bestätigen"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                required
            />

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
