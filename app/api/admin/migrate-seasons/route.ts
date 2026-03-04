import {NextRequest, NextResponse} from 'next/server';
import {connectToDatabase} from '@/lib/mongodb/connection';
import Recipe from '@/lib/mongodb/models/Recipe';
import {generateRecipeSeasons} from '@/lib/utils/generateSeasons';

/**
 * GET /api/admin/migrate-seasons
 *
 * Migrates seasons for all existing recipes that don't have seasons set.
 * Requires ADMIN_SECRET query parameter or header for security.
 *
 * Usage: /api/admin/migrate-seasons?secret=YOUR_ADMIN_SECRET
 *
 * Options:
 * - ?force=true - Regenerate seasons for ALL recipes, not just those without seasons
 */
export async function GET(request: NextRequest) {
    // Check admin secret
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = request.nextUrl.searchParams.get('secret')
        || request.headers.get('x-admin-secret');
    const forceRegenerate = request.nextUrl.searchParams.get('force') === 'true';

    if (!adminSecret) {
        return NextResponse.json(
            {error: 'ADMIN_SECRET not configured on server'},
            {status: 500}
        );
    }

    if (providedSecret !== adminSecret) {
        return NextResponse.json(
            {error: 'Unauthorized. Provide ?secret=YOUR_ADMIN_SECRET'},
            {status: 401}
        );
    }

    try {
        await connectToDatabase();

        // Find recipes that need season migration
        const query = forceRegenerate
            ? {} // All recipes
            : {$or: [{seasons: {$exists: false}}, {seasons: {$size: 0}}]};

        const recipes = await Recipe.find(query);

        const results: Array<{
            name: string;
            status: string;
            seasons?: string[];
            error?: string;
        }> = [];

        for (const recipe of recipes) {
            try {
                const seasons = await generateRecipeSeasons({
                    name: recipe.name,
                    ingredientListContent: recipe.ingredientListContent,
                });

                await Recipe.updateOne(
                    {_id: recipe._id},
                    {$set: {seasons}}
                );

                results.push({
                    name: recipe.name,
                    status: 'migrated',
                    seasons,
                });
            } catch (error) {
                results.push({
                    name: recipe.name,
                    status: 'error',
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        const migrated = results.filter(r => r.status === 'migrated').length;
        const errors = results.filter(r => r.status === 'error').length;

        return NextResponse.json({
            message: 'Season migration complete',
            summary: {
                total: recipes.length,
                migrated,
                errors,
            },
            results,
        });
    } catch (error) {
        console.error('Season migration error:', error);
        return NextResponse.json(
            {error: 'Migration failed', details: error instanceof Error ? error.message : String(error)},
            {status: 500}
        );
    }
}
