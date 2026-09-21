import {describe, expect, it} from 'vitest';
import {describeAuthResponse} from '@/lib/auth/responseDiagnostics';

function responseWith(cookies: string[], status = 302, location?: string) {
    const headers = new Headers();
    for (const cookie of cookies) {
        headers.append('set-cookie', cookie);
    }
    if (location) {
        headers.set('location', location);
    }
    return new Response(null, {status, headers});
}

describe('describeAuthResponse', () => {
    it('names every cookie the response sets, with its value length', () => {
        const described = describeAuthResponse(
            '/api/auth/callback/keycloak',
            responseWith([
                '__Secure-authjs.session-token=abcd; Path=/; Secure',
                '__Secure-authjs.pkce.code_verifier=; Path=/; Max-Age=0',
            ])
        );

        expect(described).toContain('__Secure-authjs.session-token(4)');
        expect(described).toContain('__Secure-authjs.pkce.code_verifier(0)');
    });

    it('reports status and redirect target', () => {
        const described = describeAuthResponse('/api/auth/callback/keycloak', responseWith([], 302, 'https://weemeal.test/'));

        expect(described).toContain('302');
        expect(described).toContain('https://weemeal.test/');
        expect(described).toContain('setzt: nichts');
    });

    // Ein Session-Cookie ist ein Anmeldenachweis und gehört in kein Log.
    it('never repeats a cookie value', () => {
        const described = describeAuthResponse(
            '/api/auth/callback/keycloak',
            responseWith(['__Secure-authjs.session-token=s3cret-value; Path=/'])
        );

        expect(described).not.toContain('s3cret-value');
    });
});
