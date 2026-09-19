'use client';

import {useCallback, useEffect, useState} from 'react';
import {Trash2} from 'lucide-react';

type Role = 'user' | 'admin';

interface AdminUser {
    id: string;
    username: string;
    role: Role;
}

interface AdminPanelProps {
    currentUserId: string;
}

async function readError(response: Response): Promise<string> {
    try {
        const data = await response.json();
        return typeof data?.error === 'string' ? data.error : 'Aktion fehlgeschlagen';
    } catch {
        return 'Aktion fehlgeschlagen';
    }
}

export default function AdminPanel({currentUserId}: AdminPanelProps) {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Create form
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<Role>('user');
    const [createError, setCreateError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/users', {cache: 'no-store'});
            if (!response.ok) {
                setError(await readError(response));
                return;
            }
            setUsers(await response.json());
            setError(null);
        } catch {
            setError('Benutzer konnten nicht geladen werden');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    async function handleCreate(event: React.FormEvent) {
        event.preventDefault();
        setIsCreating(true);
        setCreateError(null);

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: newUsername, password: newPassword, role: newRole}),
            });

            if (!response.ok) {
                setCreateError(await readError(response));
                return;
            }

            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            await loadUsers();
        } catch {
            setCreateError('Netzwerkfehler – bitte erneut versuchen');
        } finally {
            setIsCreating(false);
        }
    }

    async function handleDelete(user: AdminUser) {
        if (!confirm(`Benutzer "${user.username}" wirklich löschen?`)) return;
        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {method: 'DELETE'});
            if (!response.ok) {
                setError(await readError(response));
                return;
            }
            setError(null);
            await loadUsers();
        } catch {
            setError('Netzwerkfehler – bitte erneut versuchen');
        }
    }

    async function handleToggleRole(user: AdminUser) {
        const role: Role = user.role === 'admin' ? 'user' : 'admin';
        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({role}),
            });
            if (!response.ok) {
                setError(await readError(response));
                return;
            }
            setError(null);
            await loadUsers();
        } catch {
            setError('Netzwerkfehler – bitte erneut versuchen');
        }
    }

    async function handleResetPassword(user: AdminUser) {
        const password = prompt(`Neues Passwort für "${user.username}":`);
        if (password === null) return;
        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({password}),
            });
            if (!response.ok) {
                setError(await readError(response));
                return;
            }
            setError(null);
            alert('Passwort zurückgesetzt.');
        } catch {
            setError('Netzwerkfehler – bitte erneut versuchen');
        }
    }

    const self = users.find((u) => u.id === currentUserId) ?? null;
    const others = users.filter((u) => u.id !== currentUserId);

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h1 className="text-2xl font-bold text-text-dark tracking-tight">Benutzerverwaltung</h1>
                <p className="text-text-muted text-sm">Nur für Administratoren.</p>
            </div>

            {error && (
                <p className="text-sm text-error" role="alert">
                    {error}
                </p>
            )}

            {/* Create user */}
            <form onSubmit={handleCreate} className="space-y-4 bg-white rounded-2xl p-6 shadow-sm">
                <h2 className="font-semibold text-text-dark">Neuen Benutzer anlegen</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <input
                        type="text"
                        placeholder="Benutzername"
                        autoComplete="off"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        className="input"
                    />
                    <input
                        type="password"
                        placeholder="Initial-Passwort"
                        autoComplete="new-password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="input"
                    />
                    <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as Role)}
                        className="input"
                    >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                    </select>
                </div>
                {createError && (
                    <p className="text-sm text-error" role="alert">
                        {createError}
                    </p>
                )}
                <button type="submit" disabled={isCreating} className="btn btn-primary">
                    {isCreating ? 'Anlegen…' : 'Anlegen'}
                </button>
            </form>

            {/* User list */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-6">
                {isLoading ? (
                    <p className="text-text-muted text-sm">Laden…</p>
                ) : (
                    <>
                        {self && (
                            <section>
                                <h2 className="font-semibold text-text-dark mb-3">Dein Konto</h2>
                                <UserTable
                                    users={[self]}
                                    currentUserId={currentUserId}
                                    onToggleRole={handleToggleRole}
                                    onResetPassword={handleResetPassword}
                                    onDelete={handleDelete}
                                />
                            </section>
                        )}

                        <section>
                            <h2 className="font-semibold text-text-dark mb-3">Benutzer</h2>
                            {others.length === 0 ? (
                                <p className="text-text-muted text-sm">Keine weiteren Benutzer.</p>
                            ) : (
                                <UserTable
                                    users={others}
                                    currentUserId={currentUserId}
                                    onToggleRole={handleToggleRole}
                                    onResetPassword={handleResetPassword}
                                    onDelete={handleDelete}
                                />
                            )}
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

interface UserTableProps {
    users: AdminUser[];
    currentUserId: string;
    onToggleRole: (user: AdminUser) => void;
    onResetPassword: (user: AdminUser) => void;
    onDelete: (user: AdminUser) => void;
}

function UserTable({users, currentUserId, onToggleRole, onResetPassword, onDelete}: UserTableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
                <thead>
                    <tr className="text-text-muted border-b border-gray-100">
                        <th className="py-2 px-3 font-medium">Benutzername</th>
                        <th className="py-2 px-3 font-medium">Admin</th>
                        <th className="py-2 px-3 font-medium">Passwort</th>
                        <th className="py-2 px-3 font-medium"/>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {users.map((user) => {
                        const isSelf = user.id === currentUserId;
                        return (
                            <tr key={user.id}>
                                <td className="py-3 px-3 font-medium text-text-dark">{user.username}</td>
                                <td className="py-3 px-3">
                                    <input
                                        type="checkbox"
                                        checked={user.role === 'admin'}
                                        disabled={isSelf}
                                        onChange={() => onToggleRole(user)}
                                        aria-label="Admin"
                                        title={
                                            isSelf
                                                ? 'Du kannst dir die Admin-Rolle nicht selbst entziehen'
                                                : undefined
                                        }
                                        className={`accent-primary w-4 h-4 ${
                                            isSelf ? 'cursor-not-allowed' : 'cursor-pointer'
                                        }`}
                                    />
                                </td>
                                <td className="py-3 px-3">
                                    <button
                                        type="button"
                                        onClick={() => onResetPassword(user)}
                                        className="btn btn-ghost"
                                    >
                                        Zurücksetzen
                                    </button>
                                </td>
                                <td className="py-3 px-3">
                                    <div className="flex items-center justify-center">
                                        {!isSelf && (
                                            <button
                                                type="button"
                                                onClick={() => onDelete(user)}
                                                className="btn btn-error"
                                                aria-label="Löschen"
                                                title="Löschen"
                                            >
                                                <Trash2 className="w-4 h-4"/>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
