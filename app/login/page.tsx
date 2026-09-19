import {Suspense} from 'react';
import {notFound} from 'next/navigation';
import {isAuthDisabled} from '@/auth.config';
import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
    title: 'Anmelden - WeeMeal',
};

// Der Auth Mode entscheidet zur Laufzeit, nicht beim Build: ohne dies würde
// Next diese Seite prerendern und den Modus des Build-Rechners einfrieren
// (ADR 0003 — dasselbe Image muss jeden Modus fahren können).
export const dynamic = 'force-dynamic';

export default function LoginPage() {
    // Im none-Modus gibt es nichts anzumelden — die Seite existiert dort
    // schlicht nicht (ADR 0003).
    if (isAuthDisabled()) {
        notFound();
    }

    return (
        <Suspense>
            <LoginForm/>
        </Suspense>
    );
}
