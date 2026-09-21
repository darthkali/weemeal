import {NextRequest, NextResponse} from 'next/server';
import {recipeRepository} from '@/lib/mongodb/repositories/RecipeRepository';
import {validateRecipeInput} from '@/lib/validations/recipeSchema';
import {isSharingAvailable, sessionGuard} from '@/lib/auth/session';
import {shareLinkRepository} from '@/lib/mongodb/repositories/ShareLinkRepository';

// GET /api/recipes - Get all recipes
export async function GET(request: NextRequest) {
    const unauthorized = await sessionGuard();
    if (unauthorized) return unauthorized;

    try {
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');

        let recipes;
        if (search) {
            recipes = await recipeRepository.findByName(search);
        } else {
            recipes = await recipeRepository.findAll();
        }

        const sharedIds = isSharingAvailable()
            ? await shareLinkRepository.findSharedRecipeIds()
            : new Set<string>();

        // Transform MongoDB documents to plain objects
        const response = recipes.map((recipe) => ({
            _id: recipe._id.toString(),
            name: recipe.name,
            recipeYield: recipe.recipeYield,
            recipeInstructions: recipe.recipeInstructions,
            ingredientListContent: recipe.ingredientListContent,
            imageUrl: recipe.imageUrl,
            tags: recipe.tags || [],
            shared: sharedIds.has(recipe._id.toString()),
            createdAt: recipe.createdAt?.toISOString(),
            updatedAt: recipe.updatedAt?.toISOString(),
        }));

        return NextResponse.json(response);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        return NextResponse.json(
            {error: 'Failed to fetch recipes'},
            {status: 500}
        );
    }
}

// POST /api/recipes - Create a new recipe
export async function POST(request: NextRequest) {
    const unauthorized = await sessionGuard();
    if (unauthorized) return unauthorized;

    try {
        const body = await request.json();

        // Validate input
        const validation = validateRecipeInput(body);
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

        // Filter out null imageUrl for creation
        const createData = {...validation.data!};
        if (createData.imageUrl === null) {
            delete createData.imageUrl;
        }

        const recipe = await recipeRepository.create(createData as Parameters<typeof recipeRepository.create>[0]);

        const response = {
            _id: recipe._id.toString(),
            name: recipe.name,
            recipeYield: recipe.recipeYield,
            recipeInstructions: recipe.recipeInstructions,
            ingredientListContent: recipe.ingredientListContent,
            imageUrl: recipe.imageUrl,
            tags: recipe.tags || [],
            createdAt: recipe.createdAt?.toISOString(),
            updatedAt: recipe.updatedAt?.toISOString(),
        };

        return NextResponse.json(response, {status: 201});
    } catch (error) {
        console.error('Error creating recipe:', error);
        return NextResponse.json(
            {error: 'Failed to create recipe'},
            {status: 500}
        );
    }
}
