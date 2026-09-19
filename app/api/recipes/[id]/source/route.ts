import {NextRequest, NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {recipeRepository} from '@/lib/mongodb/repositories/RecipeRepository';
import {RecipeSourceSchema} from '@/lib/validations/recipeSchema';
import {z} from 'zod';

interface RouteParams {
    params: Promise<{ id: string }>;
}

const SourceSchema = z.object({
    source: RecipeSourceSchema.nullable(),
});

// PATCH /api/recipes/[id]/source - Update only the source field
export async function PATCH(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;
        const body = await request.json();

        // Validate input
        const validation = SourceSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: validation.error.issues.map((issue) => ({
                        field: issue.path.join('.'),
                        message: issue.message,
                    })),
                },
                {status: 400}
            );
        }

        const recipe = await recipeRepository.update(id, {source: validation.data.source});

        if (!recipe) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        // Revalidate cache for this recipe
        revalidatePath(`/recipe/${id}`);

        return NextResponse.json({
            success: true,
            source: recipe.source || null,
        });
    } catch (error) {
        console.error('Error updating source:', error);
        return NextResponse.json(
            {error: 'Failed to update source'},
            {status: 500}
        );
    }
}
