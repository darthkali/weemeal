/**
 * @vitest-environment node
 */
import {afterEach, describe, expect, it, vi} from 'vitest';

// Die Vitest-Config setzt AUTH_MODE='local'; für den Default-Fall muss die
// Variable weg sein, bevor auth.config frisch geladen wird.
async function loadAuthConfigWithout(mode: string | undefined) {
    vi.resetModules();
    const previous = process.env.AUTH_MODE;
    if (mode === undefined) {
        delete process.env.AUTH_MODE;
    } else {
        process.env.AUTH_MODE = mode;
    }
    try {
        return await import('@/auth.config');
    } finally {
        if (previous === undefined) {
            delete process.env.AUTH_MODE;
        } else {
            process.env.AUTH_MODE = previous;
        }
    }
}

afterEach(() => {
    vi.resetModules();
});

describe('AUTH_MODE default', () => {
    it("falls back to 'none' when nothing is configured", async () => {
        const {AUTH_MODE, isAuthDisabled, isLocalAuth} = await loadAuthConfigWithout(undefined);

        expect(AUTH_MODE).toBe('none');
        expect(isAuthDisabled()).toBe(true);
        expect(isLocalAuth()).toBe(false);
    });

    it("falls back to 'none' for an empty value", async () => {
        const {AUTH_MODE, isAuthDisabled} = await loadAuthConfigWithout('');

        expect(AUTH_MODE).toBe('none');
        expect(isAuthDisabled()).toBe(true);
    });

    it('honours an explicit mode', async () => {
        const {AUTH_MODE, isLocalAuth} = await loadAuthConfigWithout('local');

        expect(AUTH_MODE).toBe('local');
        expect(isLocalAuth()).toBe(true);
    });
});
