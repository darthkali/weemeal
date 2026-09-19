'use client';

import {useState} from 'react';
import {signIn} from 'next-auth/react';
import {useRouter, useSearchParams} from 'next/navigation';

export default function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // Nur lokale, relative Ziele zulassen — kein Open Redirect zu externen URLs.
    const rawCallback = searchParams.get('callbackUrl') || '/';
    const callbackUrl =
        rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/';

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const result = await signIn('credentials', {
            username,
            password,
            redirect: false,
        });

        setIsSubmitting(false);

        if (!result || result.error) {
            setError('Ungültiger Benutzername oder Passwort');
            return;
        }

        router.push(callbackUrl);
        router.refresh();
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-sm space-y-6 bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-bold text-text-dark tracking-tight">Anmelden</h1>
                    <p className="text-sm text-text-muted">Melde dich an, um deine Rezepte zu sehen.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label htmlFor="username" className="text-sm font-medium text-text-dark">
                            Benutzername
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            required
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor="password" className="text-sm font-medium text-text-dark">
                            Passwort
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input w-full"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
                        {isSubmitting ? 'Anmelden…' : 'Anmelden'}
                    </button>
                </form>
            </div>
        </div>
    );
}
