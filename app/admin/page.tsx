import {redirect} from 'next/navigation';
import {auth} from '@/auth';
import AdminPanel from '@/components/admin/AdminPanel';

export const metadata = {
    title: 'Benutzerverwaltung - WeeMeal',
};

export default async function AdminPage() {
    const session = await auth();
    if (!session?.user) {
        redirect('/login');
    }
    if (session.user.role !== 'admin') {
        redirect('/');
    }

    return <AdminPanel currentUserId={session.user.id}/>;
}
