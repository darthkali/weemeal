'use client';

import Image from 'next/image';
import Link from 'next/link';
import {useEffect, useRef, useState} from 'react';
import {usePathname} from 'next/navigation';
import {signOut} from 'next-auth/react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faKey, faRightFromBracket, faUsersGear} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
    username?: string | null;
    // Die Role als solche — getrennt von canManageUsers: im keycloak-Modus ist
    // man Admin, ohne dass es ein Nutzerverwaltungs-Panel gäbe.
    isAdmin?: boolean;
    // Benutzerverwaltung gibt es nur im local-Modus — im keycloak-Modus
    // verwaltet Keycloak die User, im none-Modus gibt es keine.
    canManageUsers?: boolean;
    // Passwort ändern gibt es nur im local-Modus; im keycloak-Modus liegt das
    // Passwort beim Identity Provider.
    canChangePassword?: boolean;
}

export default function Navbar({
    username,
    isAdmin,
    canManageUsers,
    canChangePassword,
}: NavbarProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    // Auf der Share-Seite nur das Logo: der Share Recipient soll weder die
    // übrige App noch die Login-Seite zu sehen bekommen.
    const isShareView = usePathname()?.startsWith('/share/') ?? false;

    // Klick außerhalb schließt das Menü.
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    const initial = username?.trim().charAt(0).toUpperCase() || '?';

    const brand = (
        <>
            <div
                className="w-10 h-10 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                <Image
                    src="/logo192.png"
                    alt="WeeMeal Logo"
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                />
            </div>
            <div className="flex flex-col">
                <span className="text-xl font-bold text-text-dark tracking-tight">WeeMeal</span>
                <span className="text-xs text-text-muted -mt-0.5 hidden sm:block">Dein Rezeptbuch</span>
            </div>
        </>
    );

    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand */}
                    {isShareView ? (
                        <div className="flex items-center gap-3 group">{brand}</div>
                    ) : (
                        <Link href="/" className="flex items-center gap-3 group">{brand}</Link>
                    )}

                    {username && !isShareView && (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                className="w-10 h-10 rounded-full bg-primary text-white font-semibold flex items-center justify-center shadow-sm hover:bg-primary-hover transition-colors"
                                aria-label="Benutzermenü"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                            >
                                {initial}
                            </button>

                            {menuOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-lg shadow-black/10 border border-gray-100 py-2"
                                >
                                    <div className="px-4 py-2 border-b border-gray-100 flex items-center gap-2">
                                        <p className="text-sm font-medium text-text-dark truncate">{username}</p>
                                        {isAdmin && (
                                            <span className="badge badge-primary shrink-0">Admin</span>
                                        )}
                                    </div>

                                    {canChangePassword && (
                                        <Link
                                            href="/account"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-dark hover:bg-gray-50 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faKey} className="w-4 h-4"/>
                                            Passwort ändern
                                        </Link>
                                    )}

                                    {canManageUsers && (
                                        <Link
                                            href="/admin"
                                            role="menuitem"
                                            onClick={() => setMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-text-dark hover:bg-gray-50 transition-colors"
                                        >
                                            <FontAwesomeIcon icon={faUsersGear} className="w-4 h-4"/>
                                            Nutzerverwaltung
                                        </Link>
                                    )}

                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => signOut({callbackUrl: '/login'})}
                                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-text-dark hover:bg-gray-50 transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4"/>
                                        Abmelden
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
