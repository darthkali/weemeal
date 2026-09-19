import NextAuth from 'next-auth';
import {NextResponse} from 'next/server';
import authConfig from './auth.config';

// Proxy (früher middleware.ts, in Next 16 umbenannt) nutzt nur den
// edge-sicheren authConfig (JWT-Prüfung), niemals den Credentials-Provider/
// Mongoose aus auth.ts.
const {auth} = NextAuth(authConfig);

export default auth((req) => {
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
});

export const config = {
    // Alles schützen außer:
    //  - api/auth        Auth.js-Endpunkte (Login/Callback/Logout)
    //  - api/images      lokale Bilder; next/image holt sie serverseitig ohne Cookie
    //  - api/recipes/bring  öffentlicher Bring-Deeplink (getbring.com ruft ohne Session)
    //  - login           Login-Seite
    //  - Next-Assets & statische Public-Dateien (Bilder etc.)
    matcher: [
        '/((?!api/auth|api/images|api/recipes/bring|login|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
    ],
};
