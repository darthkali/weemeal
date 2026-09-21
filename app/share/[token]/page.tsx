import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound} from 'next/navigation';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLinkSlash} from '@fortawesome/free-solid-svg-icons';
import type {IRecipeDocument} from '@/lib/mongodb/models/Recipe';
import {shareLinkRepository} from '@/lib/mongodb/repositories/ShareLinkRepository';
import {isSharingAvailable} from '@/lib/auth/session';
import SharedRecipeView from '@/components/recipe/SharedRecipeView';
import {SharedRecipe} from '@/types/recipe';

interface SharePageProps {
    params: Promise<{ token: string }>;
}

// Was der Share Recipient sehen darf: keine Recipe ID, keine Notes. Als
// JSON-Rundreise, damit nur Plain Objects an die Client-Komponente gehen.
function toSharedRecipe(recipe: IRecipeDocument): SharedRecipe {
    return JSON.parse(
        JSON.stringify({
            name: recipe.name,
            recipeYield: recipe.recipeYield,
            recipeInstructions: recipe.recipeInstructions,
            ingredientListContent: recipe.ingredientListContent,
            imageUrl: recipe.imageUrl || undefined,
            tags: recipe.tags || [],
            source: recipe.source?.type ? recipe.source : undefined,
        })
    );
}

// `cache`: Seite und Metadaten teilen sich eine Abfrage pro Request.
const getSharedRecipe = cache(async (token: string): Promise<SharedRecipe | null> => {
    // In einer Open Instance gibt es keine Share Links (ADR 0003).
    if (!isSharingAvailable()) {
        notFound();
    }

    const recipe = await shareLinkRepository.findRecipeByToken(token);
    return recipe ? toSharedRecipe(recipe) : null;
});

export default async function SharePage({params}: SharePageProps) {
    const {token} = await params;
    const recipe = await getSharedRecipe(token);

    // Unbekannt, widerrufen oder gelöscht — für den Share Recipient dasselbe.
    if (!recipe) {
        return (
            <div className="empty-state">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FontAwesomeIcon icon={faLinkSlash} className="w-7 h-7 text-text-muted"/>
                </div>
                <h1 className="empty-state-title">Rezept nicht (mehr) verfügbar</h1>
                <p className="empty-state-description">
                    Der Link ist ungültig oder wurde widerrufen.
                </p>
            </div>
        );
    }

    return <SharedRecipeView recipe={recipe} token={token}/>;
}

export async function generateMetadata({params}: SharePageProps): Promise<Metadata> {
    const {token} = await params;
    const recipe = await getSharedRecipe(token);

    return {
        title: recipe ? `${recipe.name} - WeeMeal` : 'Rezept nicht verfügbar - WeeMeal',
        // Der Share Token soll weder in Suchmaschinen noch per Referrer bei
        // Dritten landen.
        robots: {index: false, follow: false},
        referrer: 'no-referrer',
    };
}
