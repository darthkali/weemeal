import {NextRequest, NextResponse} from 'next/server';
import {recipeRepository} from '@/lib/mongodb/repositories/RecipeRepository';
import {bringHtmlResponse} from '@/lib/utils/bringHtmlResponse';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/recipes/bring/[id] - Get recipe HTML for Bring integration
export async function GET(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;
        const recipeDoc = await recipeRepository.findById(id);

        if (!recipeDoc) {
            return NextResponse.json(
                {error: 'Recipe not found'},
                {status: 404}
            );
        }

        return bringHtmlResponse(recipeDoc, 'public, max-age=3600');
    } catch (error) {
        console.error('Error generating Bring HTML:', error);
        return NextResponse.json(
            {error: 'Failed to generate recipe HTML'},
            {status: 500}
        );
    }
}
