'use client';

import {useState} from 'react';
import {signIn} from 'next-auth/react';

interface KeycloakSignInProps {
    callbackUrl?: string;
}

/**
 * Login im keycloak-Modus: ein Knopf, der den OIDC-Flow startet. Es gibt hier
 * bewusst kein Passwortfeld — Anmeldedaten sieht ausschließlich Keycloak.
 */
export default function KeycloakSignIn({callbackUrl = '/'}: KeycloakSignInProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-sm space-y-6 bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
                <div className="space-y-1 text-center">
                    <h1 className="text-2xl font-bold text-text-dark tracking-tight">Anmelden</h1>
                    <p className="text-sm text-text-muted">
                        Melde dich über deinen Identity Provider an, um deine Rezepte zu sehen.
                    </p>
                </div>

                <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                        setIsSubmitting(true);
                        signIn('keycloak', {callbackUrl});
                    }}
                    className="btn btn-primary w-full"
                >
                    {isSubmitting ? 'Weiterleiten…' : 'Mit Keycloak anmelden'}
                </button>
            </div>
        </div>
    );
}
