import {NextResponse} from 'next/server';
import {UserServiceError} from '@/lib/mongodb/repositories/UserService';
import {ForbiddenError, UnauthorizedError} from '@/lib/auth/session';

/**
 * Übersetzt bekannte Fehler in passende HTTP-Antworten:
 *  - UnauthorizedError → 401
 *  - ForbiddenError    → 403
 *  - UserServiceError  → 404 (not_found) / 409 (conflict) / 400 (policy, invariant)
 * Alles andere → 500 (geloggt).
 */
export function handleApiError(error: unknown): NextResponse {
    if (error instanceof UnauthorizedError) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }
    if (error instanceof ForbiddenError) {
        return NextResponse.json({error: 'Forbidden'}, {status: 403});
    }
    if (error instanceof UserServiceError) {
        const status =
            error.code === 'not_found' ? 404 : error.code === 'conflict' ? 409 : 400;
        return NextResponse.json({error: error.message}, {status});
    }
    console.error('Unhandled API error:', error);
    return NextResponse.json({error: 'Internal server error'}, {status: 500});
}
