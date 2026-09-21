// Namen und Längen der Cookies eines Requests — nie deren Werte: das
// Session-Cookie ist ein Anmeldenachweis und gehört in kein Log.
function describeCookie(pair: string): string | null {
    const separator = pair.indexOf('=');
    if (separator <= 0) {
        return null;
    }
    const name = pair.slice(0, separator).trim();
    const length = pair.length - separator - 1;
    return name === '' ? null : `${name}(${length})`;
}

/**
 * Beschreibt, was an Cookies beim Rendern ankam. Gedacht für den Fall, dass
 * keine Session zustande kommt, ohne dass Auth.js einen Fehler meldet: dann
 * unterscheidet erst diese Zeile ein fehlendes Cookie von einem, das da ist
 * und trotzdem nicht trägt.
 */
export function describeSessionCookies(cookieHeader: string | null | undefined): string {
    if (!cookieHeader) {
        return 'kein Cookie-Header';
    }

    const described = cookieHeader
        .split(';')
        .map(describeCookie)
        .filter((entry): entry is string => entry !== null);

    if (described.length === 0) {
        return 'kein Cookie-Header';
    }

    return `${described.length} Cookies, ${cookieHeader.length} Zeichen: ${described.join(', ')}`;
}
