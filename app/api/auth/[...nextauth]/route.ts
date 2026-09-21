import {NextResponse} from 'next/server';
import {isAuthDisabled} from '@/auth.config';
import {handlers} from '@/auth';
import {describeAuthResponse} from '@/lib/auth/responseDiagnostics';

// Im none-Modus gibt es keinen Login — Auth.js wird hier gar nicht erst
// aufgerufen, damit ein Deployment ohne AUTH_SECRET nicht in MissingSecret
// läuft, sondern schlicht 404 liefert (ADR 0003).
function notFound() {
    return NextResponse.json({error: 'Not found'}, {status: 404});
}

type Handler = (request: Request) => Promise<Response>;

// Kommt eine Session nicht beim Browser an, ist die erste Frage, ob sie die
// Anwendung überhaupt verlassen hat. Mit AUTH_DEBUG sagt jede Antwort der
// Auth.js-Endpunkte, was sie setzt (siehe AUTH_DEBUG im README).
function withDiagnostics(handler: Handler): Handler {
    return async (request) => {
        const response = await handler(request);
        if (process.env.AUTH_DEBUG === 'true') {
            console.warn(
                '[auth][diagnose]',
                describeAuthResponse(new URL(request.url).pathname, response)
            );
        }
        return response;
    };
}

export const GET = isAuthDisabled() ? notFound : withDiagnostics(handlers.GET as Handler);
export const POST = isAuthDisabled() ? notFound : withDiagnostics(handlers.POST as Handler);
