import {notFound} from 'next/navigation';
import RecipeFormView from '@/components/recipe/RecipeFormView';
import {RecipeResponse} from '@/types/recipe';

interface EditRecipePageProps {
    params: Promise<{ id: string }>;
}

async function getRecipe(id: string): Promise<RecipeResponse | null> {
    try {
        const baseUrl = process.env.APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/recipes/${id}`, {
            cache: 'no-store',
        });

        if (!response.ok) {
            return null;
        }

        return response.json();
    } catch {
        return null;
    }
}

export default async function EditRecipePage({params}: EditRecipePageProps) {
    const {id} = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
        notFound();
    }

    return <RecipeFormView recipe={recipe} isEditing/>;
}

export async function generateMetadata({params}: EditRecipePageProps) {
    const {id} = await params;
    const recipe = await getRecipe(id);

    if (!recipe) {
        return {
            title: 'Rezept nicht gefunden - WeeMeal',
        };
    }

    return {
        title: `${recipe.name} bearbeiten - WeeMeal`,
    };
}
