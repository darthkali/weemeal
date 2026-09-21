import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {isAuthDisabled, isKeycloakAuth} from '@/auth.config';
import LoginForm from '@/components/auth/LoginForm';
import KeycloakSignIn from '@/components/auth/KeycloakSignIn';
import {safeCallbackUrl} from '@/lib/auth/safeCallbackUrl';

export const metadata = {
    title: 'Anmelden - WeeMeal',
};

// Der Auth Mode entscheidet zur Laufzeit, nicht beim Build: ohne dies würde
// Next diese Seite prerendern und den Modus des Build-Rechners einfrieren
// (ADR 0003 — dasselbe Image muss jeden Modus fahren können).
export const dynamic = 'force-dynamic';

interface LoginPageProps {
    searchParams: Promise<{callbackUrl?: string}>;
}

export default async function LoginPage({searchParams}: LoginPageProps) {
    // Im none-Modus gibt es nichts anzumelden — die Seite existiert dort
    // schlicht nicht (ADR 0003).
    if (isAuthDisabled()) {
        notFound();
    }

    // Im keycloak-Modus gibt WeeMeal kein Passwortfeld aus: Anmeldedaten sieht
    // ausschließlich der Identity Provider (ADR 0001).
    if (isKeycloakAuth()) {
        const {callbackUrl} = await searchParams;
        return <KeycloakSignIn callbackUrl={safeCallbackUrl(callbackUrl)}/>;
    }

    return (
        <Suspense>
            <LoginForm/>
        </Suspense>
    );
}
