'use client';

import {useEffect, useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCheck, faCopy, faLink} from '@fortawesome/free-solid-svg-icons';
import Modal from '@/components/ui/Modal';

interface ShareDialogProps {
    recipeId: string;
    isOpen: boolean;
    onClose: () => void;
}

type Status = 'loading' | 'ready' | 'error';

function shareUrl(origin: string, token: string): string {
    return `${origin}/share/${token}`;
}

/**
 * Teilen eines Recipe per Share Link: erst auf ausdrücklichen Klick erzeugen,
 * dann als QR-Code und kopierbaren Link zeigen, widerrufen nur mit Bestätigung.
 */
export default function ShareDialog({recipeId, isOpen, onClose}: ShareDialogProps) {
    const [status, setStatus] = useState<Status>('loading');
    const [token, setToken] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);
    const [copied, setCopied] = useState(false);

    const endpoint = `/api/recipes/${recipeId}/share`;

    useEffect(() => {
        if (!isOpen) return;

        let cancelled = false;
        setStatus('loading');
        setConfirmRevoke(false);
        setCopied(false);

        fetch(endpoint, {cache: 'no-store'})
            .then(async (response) => {
                if (!response.ok) throw new Error('Failed to fetch share link');
                const data: {token: string | null} = await response.json();
                if (!cancelled) {
                    setToken(data.token);
                    setStatus('ready');
                }
            })
            .catch(() => {
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, endpoint]);

    const handleCreate = async () => {
        setIsBusy(true);
        try {
            const response = await fetch(endpoint, {method: 'POST'});
            if (!response.ok) throw new Error('Failed to create share link');
            const data: {token: string} = await response.json();
            setToken(data.token);
        } catch {
            setStatus('error');
        } finally {
            setIsBusy(false);
        }
    };

    const handleRevoke = async () => {
        setIsBusy(true);
        try {
            const response = await fetch(endpoint, {method: 'DELETE'});
            if (!response.ok) throw new Error('Failed to revoke share link');
            setToken(null);
            onClose();
        } catch {
            setStatus('error');
        } finally {
            setIsBusy(false);
            setConfirmRevoke(false);
        }
    };

    const link = token ? shareUrl(window.location.origin, token) : '';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Ohne Clipboard-Zugriff (z.B. kein HTTPS) bleibt das Markieren
            // und Kopieren von Hand im Textfeld.
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Rezept teilen">
            {status === 'loading' && (
                <div className="flex justify-center py-8">
                    <div className="spinner"/>
                </div>
            )}

            {status === 'error' && (
                <p className="text-center text-error py-4">
                    Etwas ist schiefgelaufen. Bitte versuche es erneut.
                </p>
            )}

            {status === 'ready' && !token && (
                <div className="flex flex-col items-center gap-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <FontAwesomeIcon icon={faLink} className="w-7 h-7 text-primary"/>
                    </div>
                    <p className="text-text-muted max-w-sm">
                        Mit dem Link kann jeder dieses Rezept ansehen, Portionen anpassen und in Bring!
                        übernehmen — ohne Login. Bearbeiten, Löschen und Notizen bleiben euch vorbehalten.
                    </p>
                    <button onClick={handleCreate} disabled={isBusy} className="btn btn-primary">
                        Link erstellen
                    </button>
                </div>
            )}

            {status === 'ready' && token && (
                <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={link} size={200}/>
                    </div>

                    <div className="flex w-full gap-2">
                        <input
                            type="text"
                            readOnly
                            value={link}
                            onFocus={(e) => e.target.select()}
                            className="input flex-1 min-w-0 text-sm"
                            aria-label="Share Link"
                        />
                        <button
                            onClick={handleCopy}
                            className="btn btn-outline shrink-0"
                            aria-label="Link kopieren"
                        >
                            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="w-4 h-4"/>
                        </button>
                    </div>

                    {confirmRevoke ? (
                        <div className="w-full text-center space-y-4">
                            <p className="text-text-muted">
                                Link wirklich widerrufen? Alle Empfänger verlieren den Zugriff.
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setConfirmRevoke(false)}
                                    disabled={isBusy}
                                    className="btn btn-outline min-w-[120px]"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleRevoke}
                                    disabled={isBusy}
                                    className="btn btn-error min-w-[120px]"
                                >
                                    Widerrufen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setConfirmRevoke(true)}
                            className="btn btn-ghost text-error"
                        >
                            Link widerrufen
                        </button>
                    )}
                </div>
            )}
        </Modal>
    );
}
