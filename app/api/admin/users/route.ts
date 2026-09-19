import {NextRequest, NextResponse} from 'next/server';
import {userService} from '@/lib/mongodb/repositories/UserService';
import {requireAdmin} from '@/lib/auth/session';
import {handleApiError} from '@/lib/api/errors';

// GET /api/admin/users - list all users (admin only)
export async function GET() {
    try {
        await requireAdmin();
        const users = await userService.listUsers();
        return NextResponse.json(users);
    } catch (error) {
        return handleApiError(error);
    }
}

// POST /api/admin/users - create a user with initial password + role (admin only)
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();

        const body = await request.json().catch(() => null);
        const username = body?.username;
        const password = body?.password;
        const role = body?.role;

        if (typeof username !== 'string' || typeof password !== 'string') {
            return NextResponse.json(
                {error: 'username and password are required'},
                {status: 400}
            );
        }

        if (role !== undefined && role !== 'user' && role !== 'admin') {
            return NextResponse.json({error: "role must be 'user' or 'admin'"}, {status: 400});
        }

        const user = await userService.createUser(username, password, role ?? 'user');
        return NextResponse.json(user, {status: 201});
    } catch (error) {
        return handleApiError(error);
    }
}
