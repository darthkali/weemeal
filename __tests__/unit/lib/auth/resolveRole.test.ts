import {describe, expect, it} from 'vitest';
import {resolveRole} from '@/lib/auth/resolveRole';

const CLIENT_ID = 'weemeal';

function realmRoles(...roles: string[]) {
    return {realm_access: {roles}};
}

function clientRoles(...roles: string[]) {
    return {resource_access: {[CLIENT_ID]: {roles}}};
}

describe('resolveRole', () => {
    it('resolves weemeal-admin to admin', () => {
        expect(resolveRole(clientRoles('weemeal-user', 'weemeal-admin'), CLIENT_ID)).toBe(
            'admin'
        );
    });

    it('resolves a plain weemeal-user to user', () => {
        expect(resolveRole(clientRoles('weemeal-user'), CLIENT_ID)).toBe('user');
    });

    it('refuses a token without weemeal-user', () => {
        expect(resolveRole(clientRoles('some-other-app-role'), CLIENT_ID)).toBeNull();
    });

    it('refuses weemeal-admin without weemeal-user — access hangs on weemeal-user alone', () => {
        expect(resolveRole(clientRoles('weemeal-admin'), CLIENT_ID)).toBeNull();
    });

    it('reads realm roles as well as client roles', () => {
        expect(resolveRole(realmRoles('weemeal-user'), CLIENT_ID)).toBe('user');
        expect(resolveRole(realmRoles('weemeal-user', 'weemeal-admin'), CLIENT_ID)).toBe(
            'admin'
        );
    });

    it('combines roles granted in the realm and on the client', () => {
        const both = {
            realm_access: {roles: ['weemeal-user']},
            resource_access: {[CLIENT_ID]: {roles: ['weemeal-admin']}},
        };

        expect(resolveRole(both, CLIENT_ID)).toBe('admin');
    });

    it('ignores roles granted for a different client', () => {
        const otherClient = {resource_access: {'other-app': {roles: ['weemeal-user']}}};

        expect(resolveRole(otherClient, CLIENT_ID)).toBeNull();
    });

    it('refuses empty, malformed or missing claims', () => {
        expect(resolveRole(undefined, CLIENT_ID)).toBeNull();
        expect(resolveRole(null, CLIENT_ID)).toBeNull();
        expect(resolveRole({}, CLIENT_ID)).toBeNull();
        expect(resolveRole({realm_access: {}}, CLIENT_ID)).toBeNull();
        expect(resolveRole({realm_access: {roles: 'weemeal-user'}}, CLIENT_ID)).toBeNull();
        expect(resolveRole('nonsense', CLIENT_ID)).toBeNull();
    });

    it('still reads realm roles when no client id is configured', () => {
        expect(resolveRole(realmRoles('weemeal-user'))).toBe('user');
        expect(resolveRole(clientRoles('weemeal-user'))).toBeNull();
    });
});
