import {NextRequest, NextResponse} from 'next/server';
import {generateRecipeSeasons} from '@/lib/utils/generateSeasons';

/**
 * POST /api/recipes/generate-seasons
 * Generate seasons for a recipe based on name and ingredients (preview)
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {name, ingredients} = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                {error: 'Recipe name is required'},
                {status: 400}
            );
        }

        // Convert ingredients to the expected format
        const ingredientListContent = Array.isArray(ingredients) ? ingredients : [];

        const seasons = await generateRecipeSeasons({
            name,
            ingredientListContent,
        });

        return NextResponse.json({seasons});
    } catch (error) {
        console.error('Error generating seasons:', error);
        return NextResponse.json(
            {error: 'Failed to generate seasons'},
            {status: 500}
        );
    }
}
