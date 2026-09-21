import {NextResponse} from 'next/server';

// Diagnose-Sonde: setzt ein Cookie wählbarer Größe, sonst nichts. Damit lässt
// sich prüfen, ob ein Cookie den Weg vom Container bis zum Browser übersteht
// — ohne dafür jedes Mal einen Login durchzuspielen.
//
// Nur erreichbar, solange AUTH_DEBUG gesetzt ist; sonst gibt es den Endpunkt
// schlicht nicht.
export async function GET(request: Request): Promise<NextResponse> {
    if (process.env.AUTH_DEBUG !== 'true') {
        return NextResponse.json({error: 'Not found'}, {status: 404});
    }

    const requested = Number(new URL(request.url).searchParams.get('size') ?? 1200);
    const size = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 8000) : 1200;

    const response = NextResponse.json({size});
    response.cookies.set({
        // Derselbe Zuschnitt wie beim Session-Cookie: nur so sagt die Sonde
        // etwas über dessen Weg aus.
        name: '__Secure-authjs.cookie-probe',
        value: 'x'.repeat(size),
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
        maxAge: 60,
    });
    return response;
}
