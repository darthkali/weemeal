import {notFound, redirect} from 'next/navigation';
import {auth} from '@/auth';
import {isLocalAuth} from '@/auth.config';
import AdminPanel from '@/components/admin/AdminPanel';

export const metadata = {
    title: 'Benutzerverwaltung - WeeMeal',
};

// Der Auth Mode entscheidet zur Laufzeit, nicht beim Build: ohne dies würde
// Next diese Seite prerendern und den Modus des Build-Rechners einfrieren
// (ADR 0003 — dasselbe Image muss jeden Modus fahren können).
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
    // Das Admin-Panel existiert nur im local-Modus: im keycloak-Modus verwaltet
    // Keycloak die User, im none-Modus gibt es gar keine.
    if (!isLocalAuth()) {
        notFound();
    }

    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }
    if (session.user.role !== 'admin') {
        redirect('/');
    }

    return <AdminPanel currentUserId={session.user.id}/>;
}
