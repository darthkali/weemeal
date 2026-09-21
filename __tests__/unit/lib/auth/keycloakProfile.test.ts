import {describe, expect, it} from 'vitest';
import {mapKeycloakProfile} from '@/lib/auth/keycloakProfile';

const CLIENT_ID = 'weemeal';

function profile(extra: Record<string, unknown> = {}) {
    return {
        sub: 'kc-1',
        preferred_username: 'alice',
        name: 'Alice Example',
        email: 'alice@example.com',
        ...extra,
    };
}

describe('mapKeycloakProfile', () => {
    it('maps the subject and the resolved role', () => {
        const user = mapKeycloakProfile(
            profile({
                resource_access: {[CLIENT_ID]: {roles: ['weemeal-user', 'weemeal-admin']}},
            }),
            CLIENT_ID
        );

        expect(user.id).toBe('kc-1');
        expect(user.role).toBe('admin');
    });

    it('uses preferred_username as the display name — that is the Username', () => {
        const user = mapKeycloakProfile(
            profile({resource_access: {[CLIENT_ID]: {roles: ['weemeal-user']}}}),
            CLIENT_ID
        );

        expect(user.name).toBe('alice');
    });

    it('falls back to name when the token carries no preferred_username', () => {
        const {preferred_username: _ignored, ...withoutUsername} = profile({
            realm_access: {roles: ['weemeal-user']},
        });

        expect(mapKeycloakProfile(withoutUsername, CLIENT_ID).name).toBe('Alice Example');
    });

    it('leaves the role null when the token grants no WeeMeal role', () => {
        const user = mapKeycloakProfile(
            profile({resource_access: {[CLIENT_ID]: {roles: ['unrelated']}}}),
            CLIENT_ID
        );

        expect(user.role).toBeNull();
    });
});
