import {NextRequest, NextResponse} from 'next/server';
import {userService} from '@/lib/mongodb/repositories/UserService';
import {requireAdmin} from '@/lib/auth/session';
import {handleApiError} from '@/lib/api/errors';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE /api/admin/users/[id] - delete a user (admin only)
export async function DELETE(_request: NextRequest, {params}: RouteParams) {
    try {
        const session = await requireAdmin();
        const {id} = await params;
        await userService.deleteUser(session.user.id, id);
        return NextResponse.json({success: true});
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH /api/admin/users/[id] - change role ({role}) or reset password ({password})
export async function PATCH(request: NextRequest, {params}: RouteParams) {
    try {
        const session = await requireAdmin();
        const {id} = await params;
        const body = await request.json().catch(() => null);

        if (body?.role !== undefined) {
            if (body.role !== 'user' && body.role !== 'admin') {
                return NextResponse.json({error: "role must be 'user' or 'admin'"}, {status: 400});
            }
            const updated = await userService.setRole(session.user.id, id, body.role);
            return NextResponse.json(updated);
        }

        if (typeof body?.password === 'string') {
            await userService.resetPassword(id, body.password);
            return NextResponse.json({success: true});
        }

        return NextResponse.json(
            {error: 'Provide either a role or a password to update'},
            {status: 400}
        );
    } catch (error) {
        return handleApiError(error);
    }
}
