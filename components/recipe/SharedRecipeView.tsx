'use client';

import {SharedRecipe} from '@/types/recipe';
import RecipeContent from '@/components/recipe/RecipeContent';

interface SharedRecipeViewProps {
    recipe: SharedRecipe;
    token: string;
}

// Die Share-Seite: nur lesen, Portionen wählen, nach Bring exportieren.
// Alles hängt am Share Token — die Recipe ID kennt der Share Recipient nicht.
export default function SharedRecipeView({recipe, token}: SharedRecipeViewProps) {
    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <RecipeContent
                recipe={recipe}
                portionsStorageKey={`share-portions-${token}`}
                bringRecipePath={`/api/share/${token}/bring`}
            />
        </div>
    );
}
