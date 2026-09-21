// Endpunkte des Realms, die WeeMeal nach dem Login noch braucht: zum
// Refreshen des Access-Tokens und zum Beenden der Keycloak-Session.
export interface KeycloakEndpoints {
    tokenEndpoint: string;
    // Nicht jeder OIDC-Provider bietet RP-initiated Logout an; Keycloak schon.
    endSessionEndpoint: string | null;
}

// Das Discovery-Dokument ändert sich praktisch nie, der Refresh läuft aber im
// Request-Pfad (auch im edge-Proxy). Einmal pro Issuer und Instanz holen.
const cache = new Map<string, Promise<KeycloakEndpoints | null>>();

// Nur für Tests: sonst überlebt der Cache das Modul für die Laufzeit der
// Instanz, was genau der Zweck ist.
export function resetKeycloakDiscoveryCache(): void {
    cache.clear();
}

// Wirft bei allem, was die Endpunkte nicht ermittelbar macht; in `null`
// übersetzt das erst der öffentliche Einstieg.
async function fetchEndpoints(
    issuer: string,
    fetchImpl: typeof fetch
): Promise<KeycloakEndpoints> {
    const response = await fetchImpl(`${issuer}/.well-known/openid-configuration`, {
        // Der Cache liegt hier im Modul; die Fetch-Schicht soll nichts eigenes
        // vorhalten, damit ein Realm-Wechsel nach einem Neustart greift.
        cache: 'no-store',
    });

    if (!response.ok) {
        throw new Error(`Discovery-Dokument lieferte HTTP ${response.status}`);
    }

    const document = (await response.json()) as {
        token_endpoint?: unknown;
        end_session_endpoint?: unknown;
    };

    if (typeof document.token_endpoint !== 'string') {
        throw new Error('Discovery-Dokument enthält keinen token_endpoint');
    }

    return {
        tokenEndpoint: document.token_endpoint,
        endSessionEndpoint:
            typeof document.end_session_endpoint === 'string'
                ? document.end_session_endpoint
                : null,
    };
}

/**
 * Liest `token_endpoint` und `end_session_endpoint` aus dem Discovery-Dokument
 * des Realms. `null` heißt: nicht ermittelbar — der Aufrufer entscheidet, was
 * das bedeutet (Refresh scheitert, Logout bleibt lokal).
 *
 * Ein Fehlschlag wird nicht gecacht, damit eine kurz nicht erreichbare
 * Keycloak die Instanz nicht dauerhaft lahmlegt.
 */
export function discoverKeycloakEndpoints(
    issuer: string | undefined,
    fetchImpl: typeof fetch = fetch
): Promise<KeycloakEndpoints | null> {
    if (!issuer) {
        return Promise.resolve(null);
    }

    const cached = cache.get(issuer);
    if (cached) {
        return cached;
    }

    const pending = fetchEndpoints(issuer, fetchImpl).catch((error) => {
        console.warn(`[auth] Keycloak-Discovery für '${issuer}' fehlgeschlagen:`, error);
        cache.delete(issuer);
        return null;
    });

    cache.set(issuer, pending);
    return pending;
}
