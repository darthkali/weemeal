import type {UserRole} from '@/lib/mongodb/models/User';

// Keycloak-Client-Rollen, die WeeMeal auswertet (ADR 0001). Ohne
// `weemeal-user` bzw. `weemeal-admin` gibt es keinen Zutritt.
export const WEEMEAL_USER_ROLE = 'weemeal-user';
export const WEEMEAL_ADMIN_ROLE = 'weemeal-admin';

interface RoleContainer {
    roles?: unknown;
}

interface KeycloakRoleClaims {
    realm_access?: RoleContainer;
    resource_access?: Record<string, RoleContainer>;
}

function toRoleList(container: unknown): string[] {
    if (typeof container !== 'object' || container === null) {
        return [];
    }
    const {roles} = container as RoleContainer;
    return Array.isArray(roles) ? roles.filter((role) => typeof role === 'string') : [];
}

/**
 * Löst die WeeMeal-Role aus den Rollen-Claims eines Keycloak-Tokens auf.
 * Reine Funktion — der ganze keycloak-seitige Zutritt hängt an ihr, deshalb
 * ohne Auth.js-, Netz- oder DB-Abhängigkeit testbar.
 *
 * Gelesen werden die Client-Rollen des konfigurierten Clients und die
 * Realm-Rollen; beide Stellen sind übliche Keycloak-Mappings.
 *
 * `null` heißt Ablehnung: kein Zutritt zu WeeMeal. Den Zutritt entscheidet
 * allein `weemeal-user` — `weemeal-admin` hebt nur die Role und öffnet für
 * sich genommen keine Tür. So steuert der Betreiber in Keycloak, wer WeeMeal
 * nutzen darf, getrennt davon, wer dort Admin ist.
 */
export function resolveRole(claims: unknown, clientId?: string): UserRole | null {
    if (typeof claims !== 'object' || claims === null) {
        return null;
    }

    const {realm_access: realmAccess, resource_access: resourceAccess} =
        claims as KeycloakRoleClaims;

    const roles = [
        ...toRoleList(realmAccess),
        ...(clientId ? toRoleList(resourceAccess?.[clientId]) : []),
    ];

    if (!roles.includes(WEEMEAL_USER_ROLE)) {
        return null;
    }
    return roles.includes(WEEMEAL_ADMIN_ROLE) ? 'admin' : 'user';
}
