import type {UserRole} from '@/lib/mongodb/models/User';
import {discoverKeycloakEndpoints} from '@/lib/auth/keycloakDiscovery';
import {resolveRole} from '@/lib/auth/resolveRole';

/**
 * Was WeeMeal von der Keycloak-Session im eigenen JWT mitführt, um sie nach
 * Ablauf des Access-Tokens nachprüfen (Refresh) und beim Logout beenden zu
 * können (id_token_hint).
 */
export interface KeycloakSessionTokens {
    refreshToken?: string;
    idToken?: string;
    // Ablauf des Access-Tokens als Unix-Zeit in Sekunden (wie Auth.js und
    // Keycloak sie liefern).
    expiresAt?: number;
    role: UserRole;
}

export interface KeycloakSessionDeps {
    issuer?: string;
    clientId?: string;
    clientSecret?: string;
    fetchImpl?: typeof fetch;
    now?: number;
}

// Die Keycloak-Env wird hier direkt gelesen statt aus auth.config: der
// Auth-Config-Modul importiert dieses hier, der umgekehrte Weg wäre ein Zyklus.
function resolveDeps(deps: KeycloakSessionDeps = {}) {
    return {
        issuer: deps.issuer ?? process.env.KEYCLOAK_ISSUER,
        clientId: deps.clientId ?? process.env.KEYCLOAK_CLIENT_ID,
        clientSecret: deps.clientSecret ?? process.env.KEYCLOAK_CLIENT_SECRET,
        fetchImpl: deps.fetchImpl ?? fetch,
        now: deps.now ?? Date.now(),
    };
}

/**
 * Ist das Access-Token abgelaufen? Ohne bekannten Ablaufzeitpunkt lautet die
 * Antwort ja: dann weiß WeeMeal nichts über die Keycloak-Session und soll
 * nachfragen, statt blind weiterzulaufen.
 */
export function isAccessTokenExpired(
    expiresAt: number | undefined,
    now: number = Date.now()
): boolean {
    if (typeof expiresAt !== 'number') {
        return true;
    }
    return expiresAt * 1000 <= now;
}

// Die Claims des frischen Access-Tokens lesen, ohne zu verifizieren: das
// Token kommt direkt vom Token-Endpunkt über TLS, nicht vom Client.
function decodeTokenClaims(token: string): unknown {
    const payload = token.split('.')[1];
    if (!payload) {
        return null;
    }

    try {
        const binary = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
        return JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
}

// Ablauf des frischen Access-Tokens in Unix-Sekunden. Keycloak liefert
// `expires_in`; fehlt es, steht der Ablauf als `exp` im Token selbst. Ohne
// beides bleibt der Ablauf unbekannt — dann wird beim nächsten Request wieder
// nachgeprüft, statt eine Frist zu erfinden.
function nextExpiry(expiresIn: unknown, claims: unknown, now: number): number | undefined {
    if (typeof expiresIn === 'number') {
        return Math.floor(now / 1000) + expiresIn;
    }
    const exp = (claims as {exp?: unknown} | null)?.exp;
    return typeof exp === 'number' ? exp : undefined;
}

interface TokenResponse {
    access_token?: unknown;
    refresh_token?: unknown;
    id_token?: unknown;
    expires_in?: unknown;
}

/**
 * Tauscht das Refresh-Token gegen ein frisches Access-Token und löst dabei die
 * Role neu auf — Rollenänderungen in Keycloak greifen damit im selben Fenster.
 *
 * `null` heißt: die Keycloak-Session trägt nicht mehr. Session beendet, User
 * deaktiviert, Token widerrufen oder `weemeal-user` entzogen — in allen Fällen
 * verliert die WeeMeal-Session ihre Grundlage und der Aufrufer verwirft sie.
 */
export async function refreshKeycloakSession<T extends KeycloakSessionTokens>(
    token: T,
    deps: KeycloakSessionDeps = {}
): Promise<T | null> {
    const {issuer, clientId, clientSecret, fetchImpl, now} = resolveDeps(deps);

    if (!token.refreshToken || !clientId || !clientSecret) {
        return null;
    }

    const endpoints = await discoverKeycloakEndpoints(issuer, fetchImpl);
    if (!endpoints) {
        return null;
    }

    let payload: TokenResponse;
    try {
        const response = await fetchImpl(endpoints.tokenEndpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: token.refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
            }).toString(),
            cache: 'no-store',
        });

        if (!response.ok) {
            console.warn(`[auth] Keycloak-Refresh abgelehnt (HTTP ${response.status})`);
            return null;
        }

        payload = (await response.json()) as TokenResponse;
    } catch (error) {
        console.warn('[auth] Keycloak-Refresh fehlgeschlagen:', error);
        return null;
    }

    if (typeof payload.access_token !== 'string') {
        return null;
    }

    const idToken = typeof payload.id_token === 'string' ? payload.id_token : undefined;

    // Die Role kommt immer aus dem frischen Token, nie aus dem alten JWT:
    // sonst überlebte ein entzogenes weemeal-user den Refresh. Gelesen wird
    // dasselbe Token wie beim Login — das ID-Token (siehe README); nur wenn
    // der Refresh keines liefert, muss das Access-Token herhalten.
    const freshClaims = decodeTokenClaims(idToken ?? payload.access_token);
    const role = resolveRole(freshClaims, clientId);
    if (!role) {
        return null;
    }

    // Das Access-Token selbst wandert bewusst nicht ins JWT: WeeMeal ruft
    // keine Keycloak-API damit auf, und das Session-Cookie reist bei jedem
    // Request mit — jedes gesparte Kilobyte hält es unter den Header-Limits
    // von Proxy und Browser.
    return {
        ...token,
        role,
        refreshToken:
            typeof payload.refresh_token === 'string' ? payload.refresh_token : token.refreshToken,
        idToken: idToken ?? token.idToken,
        expiresAt: nextExpiry(payload.expires_in, freshClaims, now),
    };
}

/**
 * RP-initiated Logout: beendet die Session im Realm, damit der nächste Login
 * wieder Anmeldedaten verlangt statt still per SSO durchzugehen.
 *
 * Serverseitiger Aufruf mit `id_token_hint` — damit braucht es keine
 * registrierte `post_logout_redirect_uri` und keinen Browser-Umweg; die
 * Antwort (eine Redirect- oder Bestätigungsseite) interessiert nicht.
 *
 * Scheitert der Aufruf, bleibt es beim lokalen Logout: das WeeMeal-Cookie ist
 * ohnehin weg, und die Keycloak-Session läuft von selbst ab.
 */
export async function endKeycloakSession(
    idToken: string | undefined,
    deps: KeycloakSessionDeps = {}
): Promise<void> {
    const {issuer, clientId, fetchImpl} = resolveDeps(deps);

    if (!idToken) {
        return;
    }

    const endpoints = await discoverKeycloakEndpoints(issuer, fetchImpl);
    if (!endpoints?.endSessionEndpoint) {
        return;
    }

    const url = new URL(endpoints.endSessionEndpoint);
    url.searchParams.set('id_token_hint', idToken);
    if (clientId) {
        url.searchParams.set('client_id', clientId);
    }

    try {
        const response = await fetchImpl(url.toString(), {cache: 'no-store'});
        // Weist Keycloak den id_token_hint zurück, antwortet es mit einer
        // Bestätigungsseite statt zu beenden — dann bliebe die Session stehen,
        // ohne dass jemand es merkt.
        if (!response.ok) {
            console.warn(`[auth] Keycloak-Logout abgelehnt (HTTP ${response.status})`);
        }
    } catch (error) {
        console.warn('[auth] Keycloak-Logout fehlgeschlagen:', error);
    }
}
