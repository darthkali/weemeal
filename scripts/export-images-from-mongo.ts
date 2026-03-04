/**
 * Migration script to export base64 images from MongoDB to filesystem
 *
 * Run with: npx tsx scripts/export-images-from-mongo.ts
 *
 * Requires MONGODB_URI environment variable
 */

import dotenv from 'dotenv';
import {connectToDatabase} from '../lib/mongodb/connection';
import Recipe from '../lib/mongodb/models/Recipe';
import {ensureImagesDir, saveImageFromDataUrl} from '../lib/images/storage';

dotenv.config({path: '.env.local'});

async function exportImages() {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();

    console.log('Ensuring images directory exists...');
    await ensureImagesDir();

    console.log('Fetching recipes with base64 images...');

    // Find all recipes where imageUrl starts with 'data:'
    const recipes = await Recipe.find({
        imageUrl: {$regex: /^data:image\//}
    });

    console.log(`Found ${recipes.length} recipes with base64 images`);

    let exported = 0;
    let errors = 0;

    for (const recipe of recipes) {
        try {
            console.log(`Processing: ${recipe.name} (${recipe._id})`);

            const {id} = await saveImageFromDataUrl(recipe.imageUrl!);
            const newUrl = `/api/images/${id}`;

            // Update the recipe with the new URL
            await Recipe.updateOne(
                {_id: recipe._id},
                {$set: {imageUrl: newUrl}}
            );

            console.log(`  ✓ Exported to ${newUrl}`);
            exported++;
        } catch (error) {
            console.error(`  ✗ Failed: ${error}`);
            errors++;
        }
    }

    console.log('\n--- Summary ---');
    console.log(`Exported: ${exported}`);
    console.log(`Errors: ${errors}`);
    console.log(`Total: ${recipes.length}`);

    process.exit(errors > 0 ? 1 : 0);
}

exportImages().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});