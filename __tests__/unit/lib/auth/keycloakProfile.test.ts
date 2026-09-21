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

    it('shows the first name when the token carries one', () => {
        const user = mapKeycloakProfile(
            profile({
                given_name: 'Alice',
                resource_access: {[CLIENT_ID]: {roles: ['weemeal-user']}},
            }),
            CLIENT_ID
        );

        expect(user.name).toBe('Alice');
    });

    it('falls back to the username when there is no first name', () => {
        const user = mapKeycloakProfile(
            profile({resource_access: {[CLIENT_ID]: {roles: ['weemeal-user']}}}),
            CLIENT_ID
        );

        expect(user.name).toBe('alice');
    });

    it('ignores a blank first name', () => {
        const user = mapKeycloakProfile(
            profile({
                given_name: '   ',
                resource_access: {[CLIENT_ID]: {roles: ['weemeal-user']}},
            }),
            CLIENT_ID
        );

        expect(user.name).toBe('alice');
    });

    it('falls back to the full name when neither is present', () => {
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
