'use client';

import {useEffect, useMemo, useState} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {QRCodeSVG} from 'qrcode.react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faBook,
    faCarrot,
    faEdit,
    faExternalLinkAlt,
    faShoppingCart,
    faTrash,
    faUsers,
    faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import {RecipeResponse} from '@/types/recipe';
import {generateBringUrl} from '@/lib/utils/generateBringUrl';
import PortionControl from '@/components/ui/PortionControl';
import ContentItem from '@/components/ui/ContentItem';
import RecipeInstructions from '@/components/ui/RecipeInstructions';
import Modal from '@/components/ui/Modal';
import DeleteDialog from '@/components/ui/DeleteDialog';
import RecipeNotes from '@/components/recipe/RecipeNotes';
import SeasonBadge from '@/components/recipe/SeasonBadge';

// Color palette for placeholder backgrounds
const PLACEHOLDER_COLORS = [
    {bg: 'from-amber-50 to-orange-100', icon: 'text-amber-400'},
    {bg: 'from-emerald-50 to-teal-100', icon: 'text-emerald-400'},
    {bg: 'from-rose-50 to-pink-100', icon: 'text-rose-400'},
    {bg: 'from-indigo-50 to-purple-100', icon: 'text-indigo-400'},
    {bg: 'from-sky-50 to-cyan-100', icon: 'text-sky-400'},
    {bg: 'from-lime-50 to-green-100', icon: 'text-lime-500'},
];

interface RecipeDetailViewProps {
    recipe: RecipeResponse;
}

export default function RecipeDetailView({recipe}: RecipeDetailViewProps) {
    const router = useRouter();
    const [portions, setPortions] = useState(recipe.recipeYield);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Count ingredients
    const ingredientCount = recipe.ingredientListContent.filter(
        (c) => c.contentType === 'INGREDIENT'
    ).length;

    // Load saved portions from localStorage
    useEffect(() => {
        const savedPortions = localStorage.getItem(`recipe-portions-${recipe._id}`);
        if (savedPortions) {
            setPortions(parseInt(savedPortions, 10));
        }
    }, [recipe._id]);

    // Save portions to localStorage
    useEffect(() => {
        localStorage.setItem(`recipe-portions-${recipe._id}`, String(portions));
    }, [recipe._id, portions]);

    const portionMultiplier = portions / recipe.recipeYield;

    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const bringUrl = generateBringUrl({
        recipeId: recipe._id,
        baseUrl,
        baseQuantity: recipe.recipeYield,
        requestedQuantity: portions,
    });

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const response = await fetch(`/api/recipes/${recipe._id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                router.refresh(); // Invalidate cache
                router.push('/');
            } else {
                console.error('Failed to delete recipe');
            }
        } catch (error) {
            console.error('Error deleting recipe:', error);
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

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
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Back Button */}
            <Link
                href="/"
                className="inline-flex items-center gap-2 text-text-muted hover:text-text-dark mb-6 group transition-colors"
            >
                <FontAwesomeIcon
                    icon={faArrowLeft}
                    className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                />
                <span>Zurueck zu Rezepten</span>
            </Link>

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
                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <button
                        onClick={() => router.push(`/recipe/${recipe._id}/edit`)}
                        className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                        aria-label="Bearbeiten"
                    >
                        <FontAwesomeIcon icon={faEdit} className="w-4 h-4 text-text-dark"/>
                    </button>
                    <button
                        onClick={() => setShowDeleteDialog(true)}
                        className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-error hover:text-white transition-colors"
                        aria-label="Loeschen"
                    >
                        <FontAwesomeIcon icon={faTrash} className="w-4 h-4"/>
                    </button>
                </div>
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

                {/* Season Badge */}
                <div className="mb-4">
                    <SeasonBadge seasons={recipe.seasons} showContext/>
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
                            {recipe.source.type === 'book' ? (
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
                            ) : (
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
                        </div>
                    )}

                    {/* Notes Section */}
                    <RecipeNotes recipeId={recipe._id} initialNotes={recipe.notes || ''}/>
                </div>
            </div>

            {/* QR Code Modal */}
            <Modal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                title="Bring! Einkaufsliste"
            >
                <div className="flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={bringUrl} size={200}/>
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-text-dark font-medium">
                            Scanne den QR-Code mit der Bring! App
                        </p>
                        <p className="text-sm text-text-muted">
                            Die Zutaten werden automatisch zu deiner Einkaufsliste hinzugefuegt.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-primary-subtle rounded-xl">
                        <FontAwesomeIcon icon={faUsers} className="w-4 h-4 text-primary"/>
                        <span className="text-sm font-medium text-primary">
                            {portions} Portionen (Original: {recipe.recipeYield})
                        </span>
                    </div>
                </div>
            </Modal>

            {/* Delete Dialog */}
            <DeleteDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
