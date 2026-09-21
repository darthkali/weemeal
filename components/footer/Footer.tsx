import Link from 'next/link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faGithub} from '@fortawesome/free-brands-svg-icons';
import {faHeart} from '@fortawesome/free-solid-svg-icons';
import type {IconProp} from '@fortawesome/fontawesome-svg-core';

export default function Footer() {
    const version = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0';
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-100 py-6 mt-auto">
            <div className="container mx-auto px-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Brand & Version */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-text-dark">WeeMeal</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-text-muted rounded-full">
                            v{version}
                        </span>
                    </div>

                    {/* Made with love */}
                    <div className="flex items-center gap-1.5 text-sm text-text-muted">
                        <span>Gemacht mit</span>
                        <FontAwesomeIcon icon={faHeart} className="w-3.5 h-3.5 text-error"/>
                        <span>fuer Hobbyköch:innen</span>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-4 text-sm">
                        <Link
                            href="https://github.com/darthkali/weemeal"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-text-muted hover:text-text-dark transition-colors"
                        >
                            <FontAwesomeIcon icon={faGithub as IconProp} className="w-4 h-4"/>
                            <span>GitHub</span>
                        </Link>
                        <Link
                            href="https://github.com/darthkali/weemeal/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-text-muted hover:text-text-dark transition-colors"
                        >
                            Feedback
                        </Link>
                    </div>
                </div>

                {/* Copyright */}
                <div className="text-center mt-4 pt-4 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                        &copy; {currentYear} WeeMeal. Alle Rechte vorbehalten.
                    </p>
                </div>
            </div>
        </footer>
    );
}
