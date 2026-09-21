'use client';

import {ReactNode, useEffect, useMemo, useState} from 'react';
import Image from 'next/image';
import {QRCodeSVG} from 'qrcode.react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faBook,
    faCarrot,
    faExternalLinkAlt,
    faQuoteRight,
    faShoppingCart,
    faUsers,
    faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import {SharedRecipe} from '@/types/recipe';
import {generateBringUrl} from '@/lib/utils/generateBringUrl';
import PortionControl from '@/components/ui/PortionControl';
import ContentItem from '@/components/ui/ContentItem';
import RecipeInstructions from '@/components/ui/RecipeInstructions';
import Modal from '@/components/ui/Modal';

// Color palette for placeholder backgrounds
const PLACEHOLDER_COLORS = [
    {bg: 'from-amber-50 to-orange-100', icon: 'text-amber-400'},
    {bg: 'from-emerald-50 to-teal-100', icon: 'text-emerald-400'},
    {bg: 'from-rose-50 to-pink-100', icon: 'text-rose-400'},
    {bg: 'from-indigo-50 to-purple-100', icon: 'text-indigo-400'},
    {bg: 'from-sky-50 to-cyan-100', icon: 'text-sky-400'},
    {bg: 'from-lime-50 to-green-100', icon: 'text-lime-500'},
];

interface RecipeContentProps {
    recipe: SharedRecipe;
    // Unter diesem Key merkt sich der Browser die Selected Portions.
    portionsStorageKey: string;
    // Pfad, unter dem Bring das Recipe als HTML abruft.
    bringRecipePath: string;
    // Aktionen über dem Bild (Teilen, Bearbeiten, Löschen) — nur mit Session.
    actions?: ReactNode;
    // Unter der Zubereitung, z.B. die Notes — nur mit Session.
    children?: ReactNode;
}

/**
 * Das Recipe so, wie es beim Kochen gelesen wird: Bild, Portionen, Zutaten,
 * Bring-Export, Zubereitung und Source. Geteilt von der Detailansicht und der
 * Share-Seite; was nur mit Session geht, reichen die Aufrufer hinein.
 */
export default function RecipeContent({
                                          recipe,
                                          portionsStorageKey,
                                          bringRecipePath,
                                          actions,
                                          children,
                                      }: RecipeContentProps) {
    const [portions, setPortions] = useState(recipe.recipeYield);
    const [showQrModal, setShowQrModal] = useState(false);

    // Count ingredients
    const ingredientCount = recipe.ingredientListContent.filter(
        (c) => c.contentType === 'INGREDIENT'
    ).length;

    // Load saved portions from localStorage
    useEffect(() => {
        const savedPortions = localStorage.getItem(portionsStorageKey);
        if (savedPortions) {
            setPortions(parseInt(savedPortions, 10));
        }
    }, [portionsStorageKey]);

    // Save portions to localStorage
    useEffect(() => {
        localStorage.setItem(portionsStorageKey, String(portions));
    }, [portionsStorageKey, portions]);

    const portionMultiplier = portions / recipe.recipeYield;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const bringUrl = generateBringUrl({
        recipePath: bringRecipePath,
        baseUrl,
        baseQuantity: recipe.recipeYield,
        requestedQuantity: portions,
    });

    // Sort ingredients by position
    const sortedIngredients = [...recipe.ingredientListContent].sort(
        (a, b) => a.position - b.position
    );

    // Consistent color based on recipe name
    const colorIndex = useMemo(() => {
        return recipe.name.length % PLACEHOLDER_COLORS.length;
    }, [recipe.name]);
    const placeholderColor = PLACEHOLDER_COLORS[colorIndex];

    return (
        <>
            {/* Hero Image */}
            <div
                className={`relative h-72 md:h-96 rounded-3xl overflow-hidden mb-8 bg-gradient-to-br ${placeholderColor.bg}`}>
                {recipe.imageUrl ? (
                    recipe.imageUrl.startsWith('data:') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    ) : (
                        <Image
                            src={recipe.imageUrl}
                            alt={recipe.name}
                            fill
                            className="object-cover"
                            priority
                            sizes="(max-width: 768px) 100vw, 1024px"
                        />
                    )
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div
                            className="w-32 h-32 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                            <FontAwesomeIcon
                                icon={faUtensils}
                                className={`w-16 h-16 ${placeholderColor.icon}`}
                            />
                        </div>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"/>

                {/* Action buttons overlay */}
                {actions && (
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        {actions}
                    </div>
                )}
            </div>

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-text-dark mb-4 tracking-tight">
                    {recipe.name}
                </h1>

                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="badge badge-primary">
                        <FontAwesomeIcon icon={faUsers} className="w-3 h-3 mr-1.5"/>
                        {recipe.recipeYield} Portionen
                    </div>
                    <div className="badge badge-secondary">
                        <FontAwesomeIcon icon={faCarrot} className="w-3 h-3 mr-1.5"/>
                        {ingredientCount} Zutaten
                    </div>
                </div>
                {/* Tags */}
                {recipe.tags && recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {recipe.tags.map((tag) => (
                            <span
                                key={tag}
                                className="px-3 py-1 rounded-full bg-gray-100 text-text-dark text-sm font-medium"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Ingredients Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Portion Control Card */}
                    <div className="card p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-sm font-medium text-text-muted mb-1">Portionen</h2>
                                <p className="text-xs text-gray-400">
                                    Original: {recipe.recipeYield}
                                </p>
                            </div>
                            <PortionControl
                                portions={portions}
                                onIncrease={() => setPortions((p) => p + 1)}
                                onDecrease={() => setPortions((p) => Math.max(1, p - 1))}
                            />
                        </div>
                    </div>

                    {/* Ingredients Card */}
                    <div className="card p-6">
                        <h2 className="section-header flex items-center gap-2">
                            <FontAwesomeIcon icon={faCarrot} className="w-4 h-4 text-primary"/>
                            Zutaten
                        </h2>
                        <div className="space-y-0.5">
                            {sortedIngredients.map((content) => (
                                <ContentItem
                                    key={content.contentId}
                                    content={content}
                                    portionMultiplier={portionMultiplier}
                                />
                            ))}
                        </div>

                        {/* QR Code Button */}
                        <div className="mt-6 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setShowQrModal(true)}
                                className="w-full btn btn-outline justify-center"
                            >
                                <FontAwesomeIcon icon={faShoppingCart} className="w-4 h-4"/>
                                Zur Bring! Einkaufsliste
                            </button>
                        </div>
                    </div>
                </div>

                {/* Instructions Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card p-6 md:p-8">
                        <h2 className="section-header text-xl mb-6">Zubereitung</h2>
                        <RecipeInstructions instructions={recipe.recipeInstructions}/>
                    </div>

                    {/* Source Section - Read Only */}
                    {recipe.source && (
                        <div className="card bg-blue-50/50 border-blue-200/50 p-5">
                            <h3 className="text-sm font-semibold text-blue-800 mb-3">
                                Originalquelle
                            </h3>
                            {recipe.source.type === 'book' && (
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FontAwesomeIcon icon={faBook} className="w-4 h-4 text-blue-600"/>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{recipe.source.bookTitle}</p>
                                        {recipe.source.bookPage && (
                                            <p className="text-xs text-gray-500 mt-0.5">{recipe.source.bookPage}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                            {recipe.source.type === 'url' && (
                                <a
                                    href={recipe.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 group"
                                >
                                    <div
                                        className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FontAwesomeIcon icon={faExternalLinkAlt} className="w-4 h-4 text-blue-600"/>
                                    </div>
                                    <span className="text-sm text-blue-600 group-hover:underline truncate">
                                        {recipe.source.url}
                                    </span>
                                </a>
                            )}
                            {recipe.source.type === 'text' && (
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FontAwesomeIcon icon={faQuoteRight} className="w-4 h-4 text-blue-600"/>
                                    </div>
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {recipe.source.text}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {children}
                </div>
            </div>

            {/* QR Code Modal */}
            <Modal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title="Bring! Einkaufsliste"
            >
                <div className="flex flex-col items-center gap-6">
                    <div className="flex flex-col items-center gap-1">
                        <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                            <QRCodeSVG value={bringUrl} size={200}/>
                        </div>

                        <p className="text-xs text-center">
                            Scanne den QR-Code um die Zutaten direkt in deine Bring! Einkaufsliste zu importieren.
                        </p>
                    </div>
                    <h1> ODER</h1>
                    <button className="px-4 py-2 bg-primary text-white rounded-xl">
                        <a href={bringUrl} target="_blank" rel="noopener noreferrer">Direkt in Bring öffnen</a>
                    </button>
                </div>
            </Modal>
        </>
    );
}
