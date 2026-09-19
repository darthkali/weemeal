import {IngredientListContent, isIngredient, isSectionCaption} from '@/types/recipe';

interface ContentItemProps {
    content: IngredientListContent;
    portionMultiplier?: number;
}

export default function ContentItem({content, portionMultiplier = 1}: ContentItemProps) {
    if (isSectionCaption(content)) {
        return (
            <div className="section-caption">
                {content.sectionName}
            </div>
        );
    }

    if (isIngredient(content)) {
        const amount = content.amount != null
            ? Math.round(content.amount * portionMultiplier * 100) / 100
            : null;

        // Format amount nicely (remove trailing zeros)
        const formattedAmount = amount !== null
            ? amount % 1 === 0
                ? amount.toString()
                : amount.toFixed(2).replace(/\.?0+$/, '')
            : null;

        return (
            <div className="ingredient-item group">
                <div className="flex items-center gap-2 flex-1">
                    {/* Bullet point */}
                    <div
                        className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors flex-shrink-0"/>

                    {/* Amount and unit */}
                    {formattedAmount !== null && (
                        <span className="font-semibold text-text-dark min-w-[5rem] tabular-nums">
                            {formattedAmount} {content.unit || ''}
                        </span>
                    )}

                    {/* Ingredient name */}
                    <span className="text-text-dark">
                        {content.ingredientName}
                    </span>
                </div>
            </div>
        );
    }

    return null;
}
