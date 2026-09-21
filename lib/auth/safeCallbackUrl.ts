/**
 * Beschränkt ein Login-Rücksprungziel auf lokale, relative Pfade — sonst
 * ließe sich der Login als Open Redirect auf eine fremde Seite missbrauchen.
 */
export function safeCallbackUrl(raw: string | null | undefined): string {
    if (!raw) {
        return '/';
    }
    // '//host' wäre protokollrelativ und damit extern.
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
}
