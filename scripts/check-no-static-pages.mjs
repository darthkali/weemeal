/**
 * Fails if `next build` prerendered a page that renders the root layout.
 *
 * Run after `next build`, with AUTH_MODE unset — the way the Docker image is
 * built: node scripts/check-no-static-pages.mjs
 *
 * The auth mode is decided at runtime (ADR 0003), but the root layout shows
 * who is signed in. A page prerendered at build time carries the session of
 * the build — none — and keeps serving it whatever mode the container runs
 * in: the navbar stays empty (see 7bfc755). A local build reads AUTH_MODE
 * from .env and would hide the problem, so this check means something only
 * where no .env is around, as in CI.
 */

import {readFileSync} from 'node:fs';

// Replaces the root layout instead of rendering it, so there is no session
// to show and nothing to lose by prerendering it.
const WITHOUT_ROOT_LAYOUT = new Set(['/_global-error']);

const manifest = JSON.parse(readFileSync('.next/prerender-manifest.json', 'utf8'));

const staticPages = Object.entries(manifest.routes)
    .filter(([route, entry]) => entry.routeType === 'page' && !WITHOUT_ROOT_LAYOUT.has(route))
    .map(([route]) => route);

if (staticPages.length > 0) {
    console.error(
        `Prerendered at build time, so they would never show the signed-in user:\n` +
            staticPages.map((route) => `  ${route}`).join('\n') +
            `\nThe root layout has to stay request-bound (await connection()).`
    );
    process.exit(1);
}

console.log('No page renders the root layout at build time.');
