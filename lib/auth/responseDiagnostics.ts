// Beschreibt, was eine Auth.js-Antwort setzt: Status, Ziel und die Cookies mit
// Namen und Wertlänge. Werte bleiben draußen — ein Session-Cookie ist ein
// Anmeldenachweis.
export function describeAuthResponse(pathname: string, response: Response): string {
    const cookies = response.headers.getSetCookie().map((cookie) => {
        const [pair = ''] = cookie.split(';');
        const separator = pair.indexOf('=');
        const name = separator > 0 ? pair.slice(0, separator) : pair;
        const valueLength = separator > 0 ? pair.length - separator - 1 : 0;
        return `${name.trim()}(${valueLength})`;
    });

    const location = response.headers.get('location');
    return (
        `${pathname} → ${response.status}` +
        (location ? ` nach ${location}` : '') +
        ` · setzt: ${cookies.length > 0 ? cookies.join(', ') : 'nichts'}`
    );
}
