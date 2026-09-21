import {NextResponse} from 'next/server';
import type {IRecipeDocument} from '@/lib/mongodb/models/Recipe';
import {generateBringHtml} from '@/lib/utils/generateBringHtml';
import {Recipe} from '@/types/recipe';

/**
 * Die Schema.org-HTML-Antwort, die Bring über den Deeplink abruft — geteilt
 * vom Bring-Endpunkt per Recipe ID und dem per Share Token.
 */
export function bringHtmlResponse(recipeDoc: IRecipeDocument, cacheControl: string): NextResponse {
    // Convert MongoDB document to Recipe type
    const recipe: Recipe = {
        _id: recipeDoc._id.toString(),
        name: recipeDoc.name,
        recipeYield: recipeDoc.recipeYield,
        recipeInstructions: recipeDoc.recipeInstructions,
        ingredientListContent: recipeDoc.ingredientListContent.map((content) => {
            if (content.contentType === 'INGREDIENT') {
                return {
                    contentId: content.contentId,
                    contentType: 'INGREDIENT' as const,
                    position: content.position,
                    ingredientName: content.ingredientName || '',
                    unit: content.unit,
                    amount: content.amount,
                };
            } else {
                return {
                    contentId: content.contentId,
                    contentType: 'SECTION_CAPTION' as const,
                    position: content.position,
                    sectionName: content.sectionName || '',
                };
            }
        }),
    };

    return new NextResponse(generateBringHtml(recipe), {
        status: 200,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': cacheControl,
        },
    });
}
