import {describe, expect, it} from 'vitest';
import {describeSessionCookies} from '@/lib/auth/sessionDiagnostics';

describe('describeSessionCookies', () => {
    it('names each cookie with the length of its value', () => {
        const described = describeSessionCookies('__Secure-authjs.session-token=abcd; other=xy');

        expect(described).toContain('__Secure-authjs.session-token(4)');
        expect(described).toContain('other(2)');
        expect(described).toContain('2 Cookies');
    });

    // Das Session-Cookie ist ein Anmeldenachweis — es darf nie ins Log.
    it('never repeats a value', () => {
        const described = describeSessionCookies('__Secure-authjs.session-token=s3cret-value');

        expect(described).not.toContain('s3cret-value');
    });

    it('says so when nothing arrived', () => {
        expect(describeSessionCookies(null)).toBe('kein Cookie-Header');
        expect(describeSessionCookies('')).toBe('kein Cookie-Header');
        expect(describeSessionCookies('   ')).toBe('kein Cookie-Header');
    });
});
