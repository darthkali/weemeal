import {NextRequest, NextResponse} from 'next/server';
import {connectToDatabase} from '@/lib/mongodb/connection';
import Recipe from '@/lib/mongodb/models/Recipe';
import {ensureImagesDir, saveImageFromDataUrl} from '@/lib/images/storage';

/**
 * GET /api/admin/migrate-images
 *
 * Migrates base64 images from MongoDB to filesystem.
 * Requires ADMIN_SECRET query parameter or header for security.
 *
 * Usage: /api/admin/migrate-images?secret=YOUR_ADMIN_SECRET
 */
export async function GET(request: NextRequest) {
    // Check admin secret
    const adminSecret = process.env.ADMIN_SECRET;
    const providedSecret = request.nextUrl.searchParams.get('secret')
        || request.headers.get('x-admin-secret');

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
        await ensureImagesDir();

        // Find all recipes with base64 data URLs
        const recipes = await Recipe.find({
            imageUrl: {$regex: /^data:image\//}
        });

        const results: Array<{ name: string; status: string; newUrl?: string; error?: string }> = [];

        for (const recipe of recipes) {
            try {
                const {id} = await saveImageFromDataUrl(recipe.imageUrl!);
                const newUrl = `/api/images/${id}`;

                await Recipe.updateOne(
                    {_id: recipe._id},
                    {$set: {imageUrl: newUrl}}
                );

                results.push({
                    name: recipe.name,
                    status: 'migrated',
                    newUrl,
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
            message: 'Migration complete',
            summary: {
                total: recipes.length,
                migrated,
                errors,
            },
            results,
        });
    } catch (error) {
        console.error('Migration error:', error);
        return NextResponse.json(
            {error: 'Migration failed', details: error instanceof Error ? error.message : String(error)},
            {status: 500}
        );
    }
}