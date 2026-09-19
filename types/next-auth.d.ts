import type {UserRole} from '@/lib/mongodb/models/User';

// Auth.js Session/JWT um die WeeMeal-spezifischen Claims erweitern.
declare module 'next-auth' {
    interface Session {
        user: {
            id: string;
            name?: string | null;
            role: UserRole;
        };
        authMode: string;
    }

    interface User {
        role: UserRole;
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        role: UserRole;
        authMode: string;
    }
}

// Auth.js v5 nutzt intern @auth/core/jwt für den JWT-Typ in den Callbacks.
declare module '@auth/core/jwt' {
    interface JWT {
        role: UserRole;
        authMode: string;
    }
}

export {};
