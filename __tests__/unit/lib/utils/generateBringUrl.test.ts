import {describe, expect, it} from 'vitest';
import {generateBringUrl} from '@/lib/utils/generateBringUrl';

describe('generateBringUrl', () => {
    it('points Bring at the given recipe path', () => {
        const url = new URL(
            generateBringUrl({
                recipePath: '/api/share/abc/bring',
                baseUrl: 'https://weemeal.example',
                baseQuantity: 4,
                requestedQuantity: 6,
            })
        );

        expect(url.origin + url.pathname).toBe('https://api.getbring.com/rest/bringrecipes/deeplink');
        expect(url.searchParams.get('url')).toBe('https://weemeal.example/api/share/abc/bring');
        expect(url.searchParams.get('baseQuantity')).toBe('4');
        expect(url.searchParams.get('requestedQuantity')).toBe('6');
    });
});
