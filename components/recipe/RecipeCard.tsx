'use client';

import {useMemo} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCarrot, faUsers, faUtensils} from '@fortawesome/free-solid-svg-icons';
import {RecipeResponse} from '@/types/recipe';

interface RecipeCardProps {
    recipe: RecipeResponse;
    priority?: boolean;
}

// Modern color palette for placeholder backgrounds
const PLACEHOLDER_COLORS = [
    {bg: 'from-amber-50 to-orange-100', icon: 'text-amber-400'},
    {bg: 'from-emerald-50 to-teal-100', icon: 'text-emerald-400'},
    {bg: 'from-rose-50 to-pink-100', icon: 'text-rose-400'},
    {bg: 'from-indigo-50 to-purple-100', icon: 'text-indigo-400'},
    {bg: 'from-sky-50 to-cyan-100', icon: 'text-sky-400'},
    {bg: 'from-lime-50 to-green-100', icon: 'text-lime-500'},
];

export default function RecipeCard({recipe, priority = false}: RecipeCardProps) {
    const ingredientCount = recipe.ingredientListContent.filter(
        (c) => c.contentType === 'INGREDIENT'
    ).length;

    // Consistent color based on recipe name
    const colorIndex = useMemo(() => {
        return recipe.name.length % PLACEHOLDER_COLORS.length;
    }, [recipe.name]);
    const placeholderColor = PLACEHOLDER_COLORS[colorIndex];

    return (
        <Link href={`/recipe/${recipe._id}`} className="block group">
            <article className="recipe-card bg-white overflow-hidden h-full flex flex-col">
                {/* Image Section */}
                <div className={`relative h-44 overflow-hidden bg-gradient-to-br ${placeholderColor.bg}`}>
                    {recipe.imageUrl ? (
                        recipe.imageUrl.startsWith('data:') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={recipe.imageUrl}
                                alt={recipe.name}
                                className="absolute inset-0 w-full h-full object-cover recipe-card-image"
                            />
                        ) : (
                            <Image
                                src={recipe.imageUrl}
                                alt={recipe.name}
                                fill
                                className="object-cover recipe-card-image"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                priority={priority}
                            />
                        )
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                                <FontAwesomeIcon
                                    icon={faUtensils}
                                    className={`w-10 h-10 ${placeholderColor.icon}`}
                                />
                            </div>
                        </div>
                    )}

                    {/* Gradient overlay for text readability */}
                    {recipe.imageUrl && (
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"/>
                    )}
                </div>

                {/* Card Content */}
                <div className="p-5 flex flex-col flex-1">
                    {/* Recipe Name */}
                    <h2 className="text-lg font-semibold text-text-dark leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {recipe.name}
                    </h2>

                    {/* Tags */}
                    {recipe.tags && recipe.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {recipe.tags.slice(0, 3).map((tag) => (
                                <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full bg-gray-100 text-text-muted text-xs font-medium"
                                >
                                    {tag}
                                </span>
                            ))}
                            {recipe.tags.length > 3 && (
                                <span
                                    className="px-2 py-0.5 rounded-full bg-gray-100 text-text-muted text-xs font-medium">
                                    +{recipe.tags.length - 3}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 mt-auto">
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <FontAwesomeIcon icon={faUsers} className="w-3.5 h-3.5"/>
                            <span className="text-sm">
                                {recipe.recipeYield} {recipe.recipeYield === 1 ? 'Portion' : 'Portionen'}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-text-muted">
                            <FontAwesomeIcon icon={faCarrot} className="w-3.5 h-3.5"/>
                            <span className="text-sm">
                                {ingredientCount} Zutaten
                            </span>
                        </div>
                    </div>
                </div>

                {/* Hover accent line */}
                <div
                    className="h-1 bg-gradient-to-r from-primary to-primary-light transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"/>
            </article>
        </Link>
    );
}
