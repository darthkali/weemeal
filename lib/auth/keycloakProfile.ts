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

function firstNonBlank(...values: (string | undefined)[]): string | null {
    for (const value of values) {
        if (value && value.trim() !== '') {
            return value;
        }
    }
    return null;
}

/**
 * Übersetzt das Keycloak-Profil in den User, den Auth.js weiterreicht. Die
 * Role kommt ausschließlich aus den Token-Claims (ADR 0001) — WeeMeal
 * speichert im keycloak-Modus nichts über den User.
 */
export function mapKeycloakProfile(profile: unknown, clientId?: string): KeycloakUser {
    const claims = (typeof profile === 'object' && profile !== null ? profile : {}) as {
        sub?: string;
        given_name?: string;
        preferred_username?: string;
        name?: string;
        email?: string;
    };

    return {
        id: claims.sub ?? '',
        // Angezeigt wird der Vorname, wenn Keycloak einen liefert — sonst der
        // Username (im keycloak-Modus der preferred_username-Claim, siehe
        // CONTEXT.md). Die Identität hängt ohnehin an `id`, nicht am Namen.
        name: firstNonBlank(claims.given_name, claims.preferred_username, claims.name),
        email: claims.email ?? null,
        role: resolveRole(profile, clientId),
    };
}
