import {redirect} from 'next/navigation';
import {auth} from '@/auth';
import ChangePasswordForm from '@/components/account/ChangePasswordForm';

export const metadata = {
    title: 'Konto - WeeMeal',
};

export default async function AccountPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }

    // Im keycloak-Modus verwaltet der Identity Provider die Passwörter.
    if (session.authMode !== 'local') {
        redirect('/');
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
