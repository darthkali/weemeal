import {userService, PublicUser} from '@/lib/mongodb/repositories/UserService';

export interface AuthorizedUser {
    id: string;
    name: string;
    role: PublicUser['role'];
}

type Credentials = Partial<Record<'username' | 'password', unknown>>;
type Authenticate = (username: string, password: string) => Promise<PublicUser | null>;

/**
 * Credential-Prüfung des local-Modus, herausgezogen aus dem Auth.js-Provider,
 * damit sie ohne das Framework testbar ist. `authenticate` ist injizierbar.
 */
export async function authorizeCredentials(
    credentials: Credentials,
    authenticate: Authenticate = (u, p) => userService.authenticate(u, p)
): Promise<AuthorizedUser | null> {
    const username = credentials?.username;
    const password = credentials?.password;

    if (typeof username !== 'string' || typeof password !== 'string') {
        return null;
    }
    if (username.length === 0 || password.length === 0) {
        return null;
    }

    const user = await authenticate(username, password);
    if (!user) {
        return null;
    }

    return {id: user.id, name: user.username, role: user.role};
}
