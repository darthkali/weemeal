import {notFound, redirect} from 'next/navigation';
import {auth} from '@/auth';
import {isLocalAuth} from '@/auth.config';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';

export const metadata = {
    title: 'Konto - WeeMeal',
};

// Der Auth Mode entscheidet zur Laufzeit, nicht beim Build: ohne dies würde
// Next diese Seite prerendern und den Modus des Build-Rechners einfrieren
// (ADR 0003 — dasselbe Image muss jeden Modus fahren können).
export const dynamic = 'force-dynamic';

export default async function AccountPage() {
    // Nur im local-Modus verwaltet WeeMeal das Passwort selbst.
    if (!isLocalAuth()) {
        notFound();
    }

    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    return (
        <div className="max-w-sm mx-auto space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold text-text-dark tracking-tight">Passwort ändern</h1>
                <p className="text-sm text-text-muted">
                    Angemeldet als {session.user.name}.
                </p>
            </div>

            <div className="bg-white rounded-3xl p-8 shadow-lg shadow-black/5">
                <ChangePasswordForm/>
            </div>
        </div>
    );
}
