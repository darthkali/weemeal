import NextAuth from 'next-auth';
import {NextResponse} from 'next/server';
import type {NextFetchEvent, NextRequest} from 'next/server';
import {isAuthDisabled, proxyAuthConfig} from './auth.config';

// Proxy (früher middleware.ts, in Next 16 umbenannt) nutzt nur die
// edge-sichere Konfiguration (JWT-Prüfung), niemals den Credentials-Provider/
// Mongoose aus auth.ts. Hier — und nur hier — läuft im keycloak-Modus die
// Refresh-Prüfung: der Proxy ist das Gate jedes geschützten Requests und die
// einzige Stelle, die ein erneuertes Token ins Cookie zurückschreiben kann.
//
// Im none-Modus wird Auth.js gar nicht erst initialisiert: es gibt nichts zu
// prüfen, und ein Deployment ohne Login soll auch ohne AUTH_SECRET starten
// (ADR 0003). Der Matcher bleibt unverändert, damit dasselbe Image jeden
// Modus fahren kann — der Modus entscheidet zur Laufzeit, nicht beim Build.
function guardRequest(req: {nextUrl: URL; auth: unknown}) {
    const {nextUrl} = req;
    const isLoggedIn = !!req.auth;

    if (isLoggedIn) {
        return NextResponse.next();
    }

    // API: 401 statt Redirect, damit Client-Fetches sauber scheitern.
    if (nextUrl.pathname.startsWith('/api')) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    // Seiten: Redirect zur Login-Seite, Ziel als callbackUrl mitgeben.
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
}

const authProxy = isAuthDisabled() ? null : NextAuth(proxyAuthConfig).auth(guardRequest);

export default function proxy(request: NextRequest, event: NextFetchEvent) {
    if (!authProxy) {
        return NextResponse.next();
    }
    // Auth.js typisiert seinen Handler für Route-Handler mit (ungenutzten)
    // `params`; als Middleware bekommt er stattdessen das NextFetchEvent.
    return (authProxy as unknown as (req: NextRequest, event: NextFetchEvent) => unknown)(
        request,
        event
    );
}

export const config = {
    // Alles schützen außer:
    //  - api/auth        Auth.js-Endpunkte (Login/Callback/Logout)
    //  - api/images      lokale Bilder; next/image holt sie serverseitig ohne Cookie
    //  - api/recipes/bring  öffentlicher Bring-Deeplink (getbring.com ruft ohne Session)
    //  - api/debug       Diagnose-Sonde; existiert nur mit AUTH_DEBUG
    //  - login           Login-Seite
    //  - Next-Assets & statische Public-Dateien (Bilder etc.)
    matcher: [
        '/((?!api/auth|api/images|api/recipes/bring|api/debug|login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
    ],
};
