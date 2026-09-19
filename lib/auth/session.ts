import type {Session} from 'next-auth';
import {NextResponse} from 'next/server';

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
 */
export async function sessionGuard(
    getSession: SessionGetter = defaultGetSession
): Promise<NextResponse | null> {
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

