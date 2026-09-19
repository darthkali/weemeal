import {notFound} from 'next/navigation';
import {headers} from 'next/headers';
import RecipeDetailView from '@/components/recipe/RecipeDetailView';
import {RecipeResponse} from '@/types/recipe';

interface RecipePageProps {
    params: Promise<{ id: string }>;
}

async function getRecipe(id: string): Promise<RecipeResponse | null> {
    try {
        // Use absolute URL for server-side fetch
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        // Forward the caller's session cookie — the recipe API now requires auth.
        const cookie = (await headers()).get('cookie') ?? '';
        const response = await fetch(`${baseUrl}/api/recipes/${id}`, {
            cache: 'no-store',
            headers: {cookie},
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    } catch {
        return null;
    }
}

export default async function RecipePage({params}: RecipePageProps) {
    const {id} = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
        notFound();
    }

    return <RecipeDetailView recipe={recipe}/>;
}

export async function generateMetadata({params}: RecipePageProps) {
    const {id} = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
        return {
            title: 'Rezept nicht gefunden - WeeMeal',
        };
    }

    return {
        title: `${recipe.name} - WeeMeal`,
        description: `Rezept für ${recipe.name} mit ${recipe.recipeYield} Portionen`,
    };
}
