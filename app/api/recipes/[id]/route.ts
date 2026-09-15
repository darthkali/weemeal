import {NextRequest, NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {recipeRepository} from '@/lib/mongodb/repositories/RecipeRepository';
import {validateRecipeUpdate} from '@/lib/validations/recipeSchema';
import {deleteImage, extractImageIdFromUrl, isLocalImageUrl} from '@/lib/images/storage';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/recipes/[id] - Get a single recipe
export async function GET(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;
        const recipe = await recipeRepository.findById(id);

        if (!recipe) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        const response = {
            _id: recipe._id.toString(),
            name: recipe.name,
            recipeYield: recipe.recipeYield,
            recipeInstructions: recipe.recipeInstructions,
            ingredientListContent: recipe.ingredientListContent,
            imageUrl: recipe.imageUrl,
            tags: recipe.tags || [],
            notes: recipe.notes || '',
            source: recipe.source || null,
            userId: recipe.userId,
            createdAt: recipe.createdAt?.toISOString(),
            updatedAt: recipe.updatedAt?.toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching recipe:', error);
        return NextResponse.json(
            {error: 'Failed to fetch recipe'},
            {status: 500}
        );
    }
}

// PUT /api/recipes/[id] - Update a recipe
export async function PUT(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;
        const body = await request.json();

        // Validate input
        const validation = validateRecipeUpdate(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validation.errors?.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                {status: 400}
            );
        }

        // Get current recipe to check for image changes
        const currentRecipe = await recipeRepository.findById(id);
        if (!currentRecipe) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        // Handle null imageUrl (means: remove the image)
        const validatedData = validation.data!;
        const updateData: Record<string, unknown> = {...validatedData};
        if (validatedData.imageUrl === null) {
            updateData.imageUrl = '';  // Empty string to clear
        }

        // Check if image is being changed or removed
        const oldImageUrl = currentRecipe.imageUrl;
        const newImageUrl = validatedData.imageUrl;
        const imageChanged = oldImageUrl && oldImageUrl !== newImageUrl;

        // Delete old image if it was a local image and is being replaced/removed
        if (imageChanged && isLocalImageUrl(oldImageUrl)) {
            const oldImageId = extractImageIdFromUrl(oldImageUrl);
            if (oldImageId) {
                await deleteImage(oldImageId).catch((err) => {
                    console.warn('Failed to delete old image:', err);
                });
            }
        }

        const recipe = await recipeRepository.update(id, updateData as Parameters<typeof recipeRepository.update>[1]);

        if (!recipe) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        // Revalidate cache for this recipe and home page
        revalidatePath(`/recipe/${id}`);
        revalidatePath('/');

        const response = {
            _id: recipe._id.toString(),
            name: recipe.name,
            recipeYield: recipe.recipeYield,
            recipeInstructions: recipe.recipeInstructions,
            ingredientListContent: recipe.ingredientListContent,
            imageUrl: recipe.imageUrl,
            tags: recipe.tags || [],
            notes: recipe.notes || '',
            source: recipe.source || null,
            userId: recipe.userId,
            createdAt: recipe.createdAt?.toISOString(),
            updatedAt: recipe.updatedAt?.toISOString(),
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error updating recipe:', error);
        return NextResponse.json(
            {error: 'Failed to update recipe'},
            {status: 500}
        );
    }
}

// DELETE /api/recipes/[id] - Delete a recipe
export async function DELETE(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;

        // First, get the recipe to check for an associated image
        const recipe = await recipeRepository.findById(id);
        if (!recipe) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        // Delete associated image if it's a local image
        if (recipe.imageUrl && isLocalImageUrl(recipe.imageUrl)) {
            const imageId = extractImageIdFromUrl(recipe.imageUrl);
            if (imageId) {
                await deleteImage(imageId).catch((err) => {
                    // Log but don't fail the recipe deletion
                    console.warn('Failed to delete associated image:', err);
                });
            }
        }

        // Delete the recipe
        const deleted = await recipeRepository.delete(id);
        if (!deleted) {
            return NextResponse.json(
                {error: 'Failed to delete recipe'},
                {status: 500}
            );
        }

        // Revalidate cache for home page
        revalidatePath('/');

        return NextResponse.json({success: true}, {status: 200});
    } catch (error) {
        console.error('Error deleting recipe:', error);
        return NextResponse.json(
            {error: 'Failed to delete recipe'},
            {status: 500}
        );
    }
}
