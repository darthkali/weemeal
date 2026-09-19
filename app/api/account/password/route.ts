import {NextRequest, NextResponse} from 'next/server';
import {userService} from '@/lib/mongodb/repositories/UserService';
import {localAuthGuard, requireSession} from '@/lib/auth/session';
import {handleApiError} from '@/lib/api/errors';

// PATCH /api/account/password - change the password of the signed-in user.
// Die Ziel-ID kommt ausschließlich aus der Session; ein im Body mitgeschickter
// Bezeichner wird ignoriert. Damit kann niemand ein fremdes Passwort ändern.
export async function PATCH(request: NextRequest) {
    // Außerhalb des local-Modus gibt es kein von WeeMeal verwaltetes Passwort.
    const notLocal = localAuthGuard();
    if (notLocal) return notLocal;

    try {
        const session = await requireSession();

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
