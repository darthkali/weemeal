import {NextRequest, NextResponse} from 'next/server';
import {userService} from '@/lib/mongodb/repositories/UserService';
import {requireSession} from '@/lib/auth/session';
import {handleApiError} from '@/lib/api/errors';
import {AUTH_MODE} from '@/auth.config';

// PATCH /api/account/password - change the password of the signed-in user.
// Die Ziel-ID kommt ausschließlich aus der Session; ein im Body mitgeschickter
// Bezeichner wird ignoriert. Damit kann niemand ein fremdes Passwort ändern.
export async function PATCH(request: NextRequest) {
    try {
        const session = await requireSession();

        // Im keycloak-Modus liegen Passwörter beim Identity Provider — hier
        // gibt es nichts zu ändern, also existiert der Endpunkt schlicht nicht.
        if (AUTH_MODE !== 'local') {
            return NextResponse.json(
                {error: 'Password changes are handled by the identity provider'},
                {status: 404}
            );
        }

        const body = await request.json().catch(() => null);
        const currentPassword = body?.currentPassword;
        const newPassword = body?.newPassword;

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return NextResponse.json(
                {error: 'currentPassword and newPassword are required'},
                {status: 400}
            );
        }

        await userService.changeOwnPassword(session.user.id, currentPassword, newPassword);
        return NextResponse.json({success: true});
    } catch (error) {
        return handleApiError(error);
    }
}
