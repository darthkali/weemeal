import type {Session} from 'next-auth';
import {NextResponse} from 'next/server';
import {isAuthDisabled, isLocalAuth} from '@/auth.config';

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.name = 'ForbiddenError';
    }
}

type SessionGetter = () => Promise<Session | null>;

// Auth.js lazy laden, damit Verbraucher/Tests, die einen eigenen Getter
// injizieren, nicht die gesamte next-auth-Runtime importieren müssen.
async function defaultGetSession(): Promise<Session | null> {
    const {auth} = await import('@/auth');
    return auth();
}

/**
 * Erzwingt eine gültige Session. Wirft `UnauthorizedError`, wenn keine
 * vorhanden ist. `getSession` ist injizierbar, damit der Guard ohne das
 * Auth.js-Runtime testbar ist.
 */
export async function requireSession(
    getSession: SessionGetter = defaultGetSession
): Promise<Session> {
    const session = await getSession();
    if (!session?.user) {
        throw new UnauthorizedError();
    }
    return session;
}

/**
 * Route-Handler-Komfort: gibt eine 401-Response zurück, wenn keine Session
 * vorhanden ist, sonst null. Defense-in-depth zusätzlich zur Middleware.
 *
 * Im none-Modus gibt es keine Session, nach der zu fragen wäre — dann geht
 * jeder Request durch (ADR 0003).
 */
export async function sessionGuard(
    getSession: SessionGetter = defaultGetSession
): Promise<NextResponse | null> {
    if (isAuthDisabled()) {
        return null;
    }

    try {
        await requireSession(getSession);
        return null;
    } catch (error) {
        // Nur echte Auth-Fehler in 401 übersetzen; Konfig-/DB-Fehler
        // durchreichen, damit sie nicht als 401 maskiert werden.
        if (error instanceof UnauthorizedError) {
            return NextResponse.json({error: 'Unauthorized'}, {status: 401});
        }
        throw error;
    }
}

/**
 * Erzwingt eine Session mit Rolle `admin`. Wirft `UnauthorizedError` ohne
 * Session, `ForbiddenError` bei fehlender Admin-Rolle. Route-Handler mappen
 * diese Fehler via `handleApiError` auf 401/403.
 */
export async function requireAdmin(
    getSession: SessionGetter = defaultGetSession
): Promise<Session> {
    const session = await requireSession(getSession);
    if (session.user.role !== 'admin') {
        throw new ForbiddenError();
    }
    return session;
}

/**
 * Route-Handler-Komfort für Endpunkte, die es nur im local-Modus gibt
 * (User-Verwaltung, eigenes Passwort): außerhalb davon existieren sie
 * schlicht nicht — 404 statt 401/403, damit der Modus nicht durchscheint.
 */
export function localAuthGuard(): NextResponse | null {
    if (isLocalAuth()) {
        return null;
    }
    return NextResponse.json({error: 'Not found'}, {status: 404});
}
