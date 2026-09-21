/**
 * @vitest-environment node
 */
import {afterEach, describe, expect, it} from 'vitest';

async function loadRoute(debug: string | undefined) {
    const previous = process.env.AUTH_DEBUG;
    if (debug === undefined) {
        delete process.env.AUTH_DEBUG;
    } else {
        process.env.AUTH_DEBUG = debug;
    }
    try {
        return await import('@/app/api/debug/cookie/route');
    } finally {
        if (previous === undefined) {
            delete process.env.AUTH_DEBUG;
        } else {
            process.env.AUTH_DEBUG = previous;
        }
    }
}

afterEach(() => {
    delete process.env.AUTH_DEBUG;
});

describe('cookie probe', () => {
    it('does not exist without AUTH_DEBUG', async () => {
        const {GET} = await loadRoute(undefined);

        const response = await GET(new Request('https://weemeal.test/api/debug/cookie'));

        expect(response.status).toBe(404);
        expect(response.headers.get('set-cookie')).toBeNull();
    });

    it('sets a cookie of the requested size', async () => {
        process.env.AUTH_DEBUG = 'true';
        const {GET} = await loadRoute('true');

        const response = await GET(
            new Request('https://weemeal.test/api/debug/cookie?size=1200')
        );
        const cookie = response.headers.get('set-cookie') ?? '';

        expect(response.status).toBe(200);
        expect(cookie).toContain('__Secure-authjs.cookie-probe=');
        expect(cookie).toContain('Secure');
        expect(cookie.length).toBeGreaterThan(1200);
    });

    // Ein Cookie jenseits der Browser-Grenze würde nichts beweisen.
    it('caps the size', async () => {
        process.env.AUTH_DEBUG = 'true';
        const {GET} = await loadRoute('true');

        const response = await GET(
            new Request('https://weemeal.test/api/debug/cookie?size=999999')
        );

        expect(await response.json()).toEqual({size: 8000});
    });
});
