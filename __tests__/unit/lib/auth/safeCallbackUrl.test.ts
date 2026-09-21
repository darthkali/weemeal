import {describe, expect, it} from 'vitest';
import {safeCallbackUrl} from '@/lib/auth/safeCallbackUrl';

describe('safeCallbackUrl', () => {
    it('keeps a local target', () => {
        expect(safeCallbackUrl('/recipe/42?portions=4')).toBe('/recipe/42?portions=4');
    });

    it('falls back to the start page for anything missing', () => {
        expect(safeCallbackUrl(null)).toBe('/');
        expect(safeCallbackUrl(undefined)).toBe('/');
        expect(safeCallbackUrl('')).toBe('/');
    });

    it('refuses external targets — no open redirect', () => {
        expect(safeCallbackUrl('https://evil.example.com')).toBe('/');
        expect(safeCallbackUrl('//evil.example.com')).toBe('/');
        expect(safeCallbackUrl('javascript:alert(1)')).toBe('/');
    });
});
