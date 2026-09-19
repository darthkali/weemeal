// Next.js Instrumentation-Hook: läuft einmal beim Server-Start.
// Seedet im local-Modus den ersten Admin (idempotent), damit ein frisch
// aufgesetztes Deployment überhaupt einen Login hat.
export async function register() {
    if (process.env.NEXT_RUNTIME !== 'nodejs') {
        return;
    }
    if ((process.env.AUTH_MODE || 'none').trim() !== 'local') {
        return;
    }

    const {seedAdmin} = await import('@/lib/auth/seedAdmin');
    try {
        const result = await seedAdmin();
        if (result.seeded) {
            console.log(`[seed] Initial admin '${result.username}' created.`);
        } else if (result.reason === 'seed-failed') {
            console.error(`[seed] Admin seeding failed: ${result.message}`);
        }
    } catch (error) {
        // Seed darf den Serverstart nie abschießen.
        console.error('[seed] Unexpected error during admin seeding:', error);
    }
}
