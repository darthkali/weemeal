'use client';

import Image from 'next/image';
import Link from 'next/link';
import {signOut} from 'next-auth/react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faRightFromBracket} from '@fortawesome/free-solid-svg-icons';

interface NavbarProps {
    username?: string | null;
}

export default function Navbar({username}: NavbarProps) {
    return (
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo/Brand */}
                    <Link
                        href="/"
                        className="flex items-center gap-3 group"
                    >
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
                    </Link>

                    {username && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-text-muted hidden sm:block">{username}</span>
                            <button
                                type="button"
                                onClick={() => signOut({callbackUrl: '/login'})}
                                className="btn btn-ghost"
                                aria-label="Abmelden"
                            >
                                <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4"/>
                                <span className="hidden sm:inline">Abmelden</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
