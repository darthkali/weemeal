import type {UserRole} from '@/lib/mongodb/models/User';
import {resolveRole} from '@/lib/auth/resolveRole';

// Was Auth.js aus einem Keycloak-Token macht. `role` darf hier null sein:
// abgelehnt wird erst im signIn-Callback, damit die Ablehnung an genau einer
// Stelle sitzt.
export interface KeycloakUser {
    id: string;
    name: string | null;
    email: string | null;
    role: UserRole | null;
}

// Auth.js typisiert den User des profile-Mappers mit gesetzter Role. Abgelehnt
// wird aber erst im signIn-Callback, damit die Ablehnung an einer Stelle sitzt
// — dieser Typ benennt genau diese Lücke, statt sie inline wegzucasten.
export type AuthJsUser = Omit<KeycloakUser, 'role'> & {role: UserRole};

/**
 * Übersetzt das Keycloak-Profil in den User, den Auth.js weiterreicht. Die
 * Role kommt ausschließlich aus den Token-Claims (ADR 0001) — WeeMeal
 * speichert im keycloak-Modus nichts über den User.
 */
export function mapKeycloakProfile(profile: unknown, clientId?: string): KeycloakUser {
    const claims = (typeof profile === 'object' && profile !== null ? profile : {}) as {
        sub?: string;
        preferred_username?: string;
        name?: string;
        email?: string;
    };

    return {
        id: claims.sub ?? '',
        // Der Username eines User ist im keycloak-Modus der
        // preferred_username-Claim (CONTEXT.md).
        name: claims.preferred_username ?? claims.name ?? null,
        email: claims.email ?? null,
        role: resolveRole(profile, clientId),
    };
}
