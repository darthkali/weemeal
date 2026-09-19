import {NextResponse} from 'next/server';
import {isAuthDisabled} from '@/auth.config';
import {handlers} from '@/auth';

// Im none-Modus gibt es keinen Login — Auth.js wird hier gar nicht erst
// aufgerufen, damit ein Deployment ohne AUTH_SECRET nicht in MissingSecret
// läuft, sondern schlicht 404 liefert (ADR 0003).
function notFound() {
    return NextResponse.json({error: 'Not found'}, {status: 404});
}

export const GET = isAuthDisabled() ? notFound : handlers.GET;
export const POST = isAuthDisabled() ? notFound : handlers.POST;
