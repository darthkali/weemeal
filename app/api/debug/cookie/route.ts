import {NextResponse} from 'next/server';

const PROBE_COOKIE = '__Secure-authjs.cookie-probe';

// Diagnose-Sonde: setzt ein Cookie wählbarer Größe, sonst nichts. Damit lässt
// sich prüfen, ob ein Cookie den Weg vom Container bis zum Browser übersteht
// — ohne dafür jedes Mal einen Login durchzuspielen.
//
// Mit `redirect=1` antwortet sie wie der Login-Callback: ein 302 mit mehreren
// Set-Cookie-Headern auf einmal. Das ist die Form, in der das Session-Cookie
// tatsächlich verschickt wird, und damit die Form, die zu prüfen ist.
//
// Nur erreichbar, solange AUTH_DEBUG gesetzt ist; sonst gibt es den Endpunkt
// schlicht nicht.
export async function GET(request: Request): Promise<NextResponse> {
    if (process.env.AUTH_DEBUG !== 'true') {
        return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const url = new URL(request.url);
    const requested = Number(url.searchParams.get('size') ?? 1200);
    const size = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 8000) : 1200;
    const asRedirect = url.searchParams.get('redirect') === '1';

    // Was der Container vom Request sieht: daran hängt jede URL, die Next und
    // Auth.js selbst bauen — Redirects, Callback-Ziele, Cookie-Kontext.
    const seen = {
        size,
        url: request.url,
        host: request.headers.get('host'),
        forwardedHost: request.headers.get('x-forwarded-host'),
        forwardedProto: request.headers.get('x-forwarded-proto'),
        authUrl: process.env.AUTH_URL ?? null,
    };

    const response = asRedirect
        ? NextResponse.redirect(new URL('/login', url), 302)
        : NextResponse.json(seen);

    response.cookies.set({
        // Derselbe Zuschnitt wie beim Session-Cookie: nur so sagt die Sonde
        // etwas über dessen Weg aus.
        name: PROBE_COOKIE,
        value: 'x'.repeat(size),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        maxAge: 300,
    });

    // Der Callback räumt nebenbei seine Flow-Cookies ab — also stehen dort
    // mehrere Set-Cookie-Header in einer Antwort. Nachgestellt, weil genau das
    // manche Proxies unterschiedlich behandeln.
    if (asRedirect) {
        for (const name of ['__Secure-authjs.probe-a', '__Secure-authjs.probe-b']) {
            response.cookies.set({name, value: '', path: '/', secure: true, maxAge: 0});
        }
    }

    return response;
}
