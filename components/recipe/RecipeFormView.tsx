'use client';

import {useCallback, useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {DragDropContext, Draggable, Droppable, DropResult,} from '@hello-pangea/dnd';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
    faArrowLeft,
    faBook,
    faCarrot,
    faExternalLinkAlt,
    faGripVertical,
    faImage,
    faLayerGroup,
    faMagicWandSparkles,
    faPlus,
    faSave,
    faSpinner,
    faTags,
    faTimes,
    faTrash,
    faUtensils,
} from '@fortawesome/free-solid-svg-icons';
import {v4 as uuidv4} from 'uuid';
import {IngredientListContent, RecipeResponse} from '@/types/recipe';
import PortionControl from '@/components/ui/PortionControl';
import ImageUpload from '@/components/ui/ImageUpload';

interface RecipeFormViewProps {
    recipe?: RecipeResponse;
    isEditing?: boolean;
}

export default function RecipeFormView({
                                           recipe,
                                           isEditing = false,
                                       }: RecipeFormViewProps) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState(recipe?.name || '');
    const [recipeYield, setRecipeYield] = useState(recipe?.recipeYield || 4);
    const [recipeInstructions, setRecipeInstructions] = useState(
        recipe?.recipeInstructions || ''
    );
    const [ingredientListContent, setIngredientListContent] = useState<
        IngredientListContent[]
    >(recipe?.ingredientListContent || []);
    const [imageUrl, setImageUrl] = useState(recipe?.imageUrl || '');
    const [tags, setTags] = useState<string[]>(recipe?.tags || []);
    const [newTag, setNewTag] = useState('');
    const [isGeneratingTags, setIsGeneratingTags] = useState(false);

    // Source state
    const [sourceType, setSourceType] = useState<'none' | 'book' | 'url'>(
        recipe?.source?.type || 'none'
    );
    const [sourceBookTitle, setSourceBookTitle] = useState(recipe?.source?.bookTitle || '');
    const [sourceBookPage, setSourceBookPage] = useState(recipe?.source?.bookPage || '');
    const [sourceUrl, setSourceUrl] = useState(recipe?.source?.url || '');

    // Validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleAddIngredient = useCallback(() => {
        const newIngredient: IngredientListContent = {
            contentId: uuidv4(),
            contentType: 'INGREDIENT',
            position: ingredientListContent.length,
            ingredientName: '',
            amount: undefined,
            unit: '',
        };
        setIngredientListContent((prev) => [...prev, newIngredient]);
    }, [ingredientListContent.length]);

    const handleAddSection = useCallback(() => {
        const newSection: IngredientListContent = {
            contentId: uuidv4(),
            contentType: 'SECTION_CAPTION',
            position: ingredientListContent.length,
            sectionName: '',
        };
        setIngredientListContent((prev) => [...prev, newSection]);
    }, [ingredientListContent.length]);

    const handleRemoveContent = useCallback((contentId: string) => {
        setIngredientListContent((prev) =>
            prev
                .filter((c) => c.contentId !== contentId)
                .map((c, idx) => ({...c, position: idx}))
        );
    }, []);

    const handleContentChange = useCallback(
        (contentId: string, field: string, value: string | number) => {
            setIngredientListContent((prev) =>
                prev.map((c) =>
                    c.contentId === contentId ? {...c, [field]: value} : c
                )
            );
        },
        []
    );

    const handleDragEnd = useCallback((result: DropResult) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destIndex = result.destination.index;

        if (sourceIndex === destIndex) return;

        setIngredientListContent((prev) => {
            const items = [...prev];
            const [removed] = items.splice(sourceIndex, 1);
            items.splice(destIndex, 0, removed);
            return items.map((item, idx) => ({...item, position: idx}));
        });
    }, []);

    // Tag management
    const handleAddTag = useCallback(() => {
        const trimmedTag = newTag.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags(prev => [...prev, trimmedTag]);
            setNewTag('');
        }
    }, [newTag, tags]);

    const handleRemoveTag = useCallback((tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    }, []);

    const handleGenerateTags = useCallback(async () => {
        if (!name.trim()) {
            setErrors(prev => ({...prev, tags: 'Bitte zuerst einen Rezeptnamen eingeben'}));
            return;
        }

        setIsGeneratingTags(true);
        setErrors(prev => {
            const {tags: _tagsError, ...rest} = prev;
            return rest;
        });

        try {
            const response = await fetch('/api/recipes/generate-tags', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    name: name.trim(),
                    ingredients: ingredientListContent,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                // Merge with existing tags, avoiding duplicates
                setTags(prev => {
                    const newTags = data.tags.filter((t: string) => !prev.includes(t));
                    return [...prev, ...newTags];
                });
            } else {
                setErrors(prev => ({...prev, tags: 'Fehler beim Generieren der Tags'}));
            }
        } catch (error) {
            console.error('Error generating tags:', error);
            setErrors(prev => ({...prev, tags: 'Fehler beim Generieren der Tags'}));
        } finally {
            setIsGeneratingTags(false);
        }
    }, [name, ingredientListContent]);

    const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    }, [handleAddTag]);

    const validate = useCallback(() => {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'Rezeptname ist erforderlich';
        }

        if (recipeYield < 1) {
            newErrors.recipeYield = 'Mindestens 1 Portion erforderlich';
        }

        // Validate ingredients
        ingredientListContent.forEach((content, index) => {
            if (content.contentType === 'INGREDIENT') {
                if (!content.ingredientName?.trim()) {
                    newErrors[`ingredient-${index}`] = 'Zutatenname erforderlich';
                }
            } else if (content.contentType === 'SECTION_CAPTION') {
                if (!content.sectionName?.trim()) {
                    newErrors[`section-${index}`] = 'Abschnittsname erforderlich';
                }
            }
        });

        // Validate source fields
        if (sourceType === 'book' && !sourceBookTitle.trim()) {
            newErrors.sourceBookTitle = 'Buchtitel ist erforderlich';
        }
        if (sourceType === 'url' && !sourceUrl.trim()) {
            newErrors.sourceUrl = 'URL ist erforderlich';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [name, recipeYield, ingredientListContent, sourceType, sourceBookTitle, sourceUrl]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        setIsSaving(true);

        try {
            const data: Record<string, unknown> = {
                name: name.trim(),
                recipeYield,
                recipeInstructions,
                ingredientListContent: ingredientListContent.map((c, idx) => ({
                    ...c,
                    position: idx,
                })),
                tags,
                source: sourceType === 'none' ? null : sourceType === 'book'
                    ? {
                        type: 'book' as const,
                        bookTitle: sourceBookTitle.trim(),
                        bookPage: sourceBookPage.trim() || undefined
                    }
                    : {
                        type: 'url' as const,
                        url: sourceUrl.trim().match(/^https?:\/\//)
                            ? sourceUrl.trim()
                            : `https://${sourceUrl.trim()}`
                    },
            };

            // Include imageUrl - use null to explicitly clear, or the URL to set
            if (imageUrl) {
                data.imageUrl = imageUrl;
            } else if (isEditing) {
                // Only send null when editing (to clear existing image)
                data.imageUrl = null;
            }

            const url = isEditing ? `/api/recipes/${recipe?._id}` : '/api/recipes';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data),
            });

            if (response.ok) {
                const savedRecipe = await response.json();
                // Navigate directly - the API already revalidated the cache
                router.push(`/recipe/${savedRecipe._id}`);
                router.refresh();
            } else {
                const error = await response.json();
                console.error('Failed to save recipe:', error);
                setErrors({submit: 'Fehler beim Speichern des Rezepts'});
            }
        } catch (error) {
            console.error('Error saving recipe:', error);
            setErrors({submit: 'Fehler beim Speichern des Rezepts'});
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto animate-fade-in">
            {/* Back Button */}
            <Link
                href={isEditing ? `/recipe/${recipe?._id}` : '/'}
                className="inline-flex items-center gap-2 text-text-muted hover:text-text-dark mb-6 group transition-colors"
            >
                <FontAwesomeIcon
                    icon={faArrowLeft}
                    className="w-4 h-4 group-hover:-translate-x-1 transition-transform"
                />
                <span>Zurueck</span>
            </Link>

            {/* Header Card */}
            <div className="card p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div
                        className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                        <FontAwesomeIcon icon={faUtensils} className="w-6 h-6 text-white"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-dark">
                            {isEditing ? 'Rezept bearbeiten' : 'Neues Rezept'}
                        </h1>
                        <p className="text-sm text-text-muted">
                            {isEditing ? 'Aendere die Details deines Rezepts' : 'Erstelle ein neues Rezept fuer deine Sammlung'}
                        </p>
                    </div>
                </div>

                {/* Recipe Name */}
                <div className="mb-6">
                    <label htmlFor="name" className="block text-sm font-medium text-text-dark mb-2">
                        Rezeptname <span className="text-error">*</span>
                    </label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={`input text-lg ${errors.name ? 'input-error' : ''}`}
                        placeholder="z.B. Spaghetti Bolognese"
                    />
                    {errors.name && (
                        <p className="text-error text-sm mt-2 flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-error"/>
                            {errors.name}
                        </p>
                    )}
                </div>

                {/* Tags */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-text-dark">
                            <FontAwesomeIcon icon={faTags} className="w-3.5 h-3.5 mr-1.5 text-text-muted"/>
                            Tags
                        </label>
                        <button
                            type="button"
                            onClick={handleGenerateTags}
                            disabled={isGeneratingTags || !name.trim()}
                            className="text-xs font-medium text-primary hover:text-primary-hover disabled:text-gray-400 flex items-center gap-1.5 transition-colors"
                        >
                            {isGeneratingTags ? (
                                <>
                                    <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin"/>
                                    Generiere...
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faMagicWandSparkles} className="w-3 h-3"/>
                                    Auto-generieren
                                </>
                            )}
                        </button>
                    </div>

                    {/* Tag chips */}
                    <div className="flex flex-wrap gap-2 mb-3">
                        {tags.map((tag) => (
                            <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-subtle text-primary text-sm font-medium"
                            >
                                {tag}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTag(tag)}
                                    className="w-4 h-4 rounded-full hover:bg-primary/20 flex items-center justify-center transition-colors"
                                    aria-label={`Tag ${tag} entfernen`}
                                >
                                    <FontAwesomeIcon icon={faTimes} className="w-2.5 h-2.5"/>
                                </button>
                            </span>
                        ))}
                        {tags.length === 0 && (
                            <span className="text-sm text-text-muted">Keine Tags</span>
                        )}
                    </div>

                    {/* Add tag input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            className="input flex-1"
                            placeholder="Neuen Tag eingeben..."
                            maxLength={25}
                        />
                        <button
                            type="button"
                            onClick={handleAddTag}
                            disabled={!newTag.trim()}
                            className="btn btn-outline px-4"
                        >
                            <FontAwesomeIcon icon={faPlus} className="w-4 h-4"/>
                        </button>
                    </div>
                    {errors.tags && (
                        <p className="text-error text-sm mt-2">{errors.tags}</p>
                    )}
                </div>

                {/* Source / Originalquelle */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-text-dark mb-2">
                        Originalquelle (optional)
                    </label>

                    {/* Source type toggle */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setSourceType('none')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                sourceType === 'none'
                                    ? 'bg-gray-200 text-gray-800'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                            }`}
                        >
                            Keine
                        </button>
                        <button
                            type="button"
                            onClick={() => setSourceType('book')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                                sourceType === 'book'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                            }`}
                        >
                            <FontAwesomeIcon icon={faBook} className="w-3 h-3"/>
                            Buch
                        </button>
                        <button
                            type="button"
                            onClick={() => setSourceType('url')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                                sourceType === 'url'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-150'
                            }`}
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="w-3 h-3"/>
                            Website
                        </button>
                    </div>

                    {/* Source fields based on type */}
                    {sourceType === 'book' && (
                        <div className="space-y-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-3">
                            <div>
                                <input
                                    type="text"
                                    value={sourceBookTitle}
                                    onChange={(e) => setSourceBookTitle(e.target.value)}
                                    className={`input ${errors.sourceBookTitle ? 'border-error' : ''}`}
                                    placeholder="Buchtitel *"
                                    maxLength={200}
                                />
                                {errors.sourceBookTitle && (
                                    <p className="text-error text-sm mt-1">{errors.sourceBookTitle}</p>
                                )}
                            </div>
                            <input
                                type="text"
                                value={sourceBookPage}
                                onChange={(e) => setSourceBookPage(e.target.value)}
                                className="input"
                                placeholder="Seite(n), z.B. S. 42 oder S. 15-18 (optional)"
                                maxLength={50}
                            />
                        </div>
                    )}

                    {sourceType === 'url' && (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 mt-3">
                            <input
                                type="text"
                                value={sourceUrl}
                                onChange={(e) => setSourceUrl(e.target.value)}
                                className={`input ${errors.sourceUrl ? 'border-error' : ''}`}
                                placeholder="z.B. google.de oder https://... *"
                                maxLength={2000}
                            />
                            {errors.sourceUrl && (
                                <p className="text-error text-sm mt-1">{errors.sourceUrl}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Portions */}
                <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                        Portionen
                    </label>
                    <div className="flex items-center gap-4">
                        <PortionControl
                            portions={recipeYield}
                            onIncrease={() => setRecipeYield((p) => p + 1)}
                            onDecrease={() => setRecipeYield((p) => Math.max(1, p - 1))}
                        />
                        <span className="text-sm text-text-muted">
                            Anzahl der Portionen fuer dieses Rezept
                        </span>
                    </div>
                    {errors.recipeYield && (
                        <p className="text-error text-sm mt-2">{errors.recipeYield}</p>
                    )}
                </div>
            </div>

            {/* Image Card */}
            <div className="card p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-secondary-subtle flex items-center justify-center">
                        <FontAwesomeIcon icon={faImage} className="w-5 h-5 text-secondary"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-dark">Rezeptbild</h2>
                        <p className="text-sm text-text-muted">
                            Lade ein eigenes Bild hoch
                        </p>
                    </div>
                </div>

                <ImageUpload
                    value={imageUrl}
                    onChange={(url) => setImageUrl(url || '')}
                    recipeName={name}
                />

                {errors.image && (
                    <p className="text-error text-sm mt-3 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-error"/>
                        {errors.image}
                    </p>
                )}
            </div>

            {/* Ingredients Card */}
            <div className="card p-6 md:p-8 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-primary-subtle flex items-center justify-center">
                        <FontAwesomeIcon icon={faCarrot} className="w-5 h-5 text-primary"/>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-dark">Zutaten</h2>
                        <p className="text-sm text-text-muted">
                            Ziehe die Elemente zum Sortieren
                        </p>
                    </div>
                </div>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="ingredients">
                        {(provided) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="space-y-3"
                            >
                                {ingredientListContent.length === 0 && (
                                    <div className="text-center py-8 text-text-muted">
                                        <FontAwesomeIcon icon={faCarrot} className="w-8 h-8 text-gray-300 mb-3"/>
                                        <p>Noch keine Zutaten hinzugefuegt</p>
                                    </div>
                                )}

                                {ingredientListContent.map((content, index) => (
                                    <Draggable
                                        key={content.contentId}
                                        draggableId={content.contentId}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors transition-shadow ${
                                                    snapshot.isDragging
                                                        ? 'bg-white shadow-lg border-primary'
                                                        : content.contentType === 'SECTION_CAPTION'
                                                            ? 'bg-primary-subtle/30 border-primary/20'
                                                            : 'bg-gray-50 border-transparent hover:border-gray-200'
                                                }`}
                                            >
                                                {/* Drag Handle */}
                                                <div
                                                    {...provided.dragHandleProps}
                                                    className="drag-handle p-1"
                                                >
                                                    <FontAwesomeIcon
                                                        icon={faGripVertical}
                                                        className="w-4 h-4"
                                                    />
                                                </div>

                                                {content.contentType === 'INGREDIENT' ? (
                                                    <>
                                                        {/* Amount */}
                                                        <input
                                                            type="number"
                                                            value={content.amount ?? ''}
                                                            onChange={(e) =>
                                                                handleContentChange(
                                                                    content.contentId,
                                                                    'amount',
                                                                    e.target.value ? parseFloat(e.target.value) : ''
                                                                )
                                                            }
                                                            className="input w-20 text-center"
                                                            placeholder="0"
                                                            step="any"
                                                        />

                                                        {/* Unit */}
                                                        <input
                                                            type="text"
                                                            value={content.unit ?? ''}
                                                            onChange={(e) =>
                                                                handleContentChange(
                                                                    content.contentId,
                                                                    'unit',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="input w-20 text-center"
                                                            placeholder="g"
                                                        />

                                                        {/* Ingredient Name */}
                                                        <input
                                                            type="text"
                                                            value={content.ingredientName ?? ''}
                                                            onChange={(e) =>
                                                                handleContentChange(
                                                                    content.contentId,
                                                                    'ingredientName',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className={`input flex-1 ${
                                                                errors[`ingredient-${index}`] ? 'input-error' : ''
                                                            }`}
                                                            placeholder="Zutat eingeben..."
                                                        />
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Section indicator */}
                                                        <div className="flex items-center gap-2 px-2">
                                                            <FontAwesomeIcon
                                                                icon={faLayerGroup}
                                                                className="w-4 h-4 text-primary"
                                                            />
                                                        </div>

                                                        {/* Section Caption */}
                                                        <input
                                                            type="text"
                                                            value={content.sectionName ?? ''}
                                                            onChange={(e) =>
                                                                handleContentChange(
                                                                    content.contentId,
                                                                    'sectionName',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className={`input flex-1 font-semibold ${
                                                                errors[`section-${index}`] ? 'input-error' : ''
                                                            }`}
                                                            placeholder="Abschnitt (z.B. Fuer die Sauce)"
                                                        />
                                                    </>
                                                )}

                                                {/* Delete Button */}
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveContent(content.contentId)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400 hover:bg-error/10 hover:text-error transition-colors"
                                                    aria-label="Entfernen"
                                                >
                                                    <FontAwesomeIcon icon={faTrash} className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* Add Buttons */}
                <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={handleAddIngredient}
                        className="btn btn-outline"
                    >
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4"/>
                        Zutat
                    </button>
                    <button
                        type="button"
                        onClick={handleAddSection}
                        className="btn btn-ghost"
                    >
                        <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4"/>
                        Abschnitt
                    </button>
                </div>
            </div>

            {/* Instructions Card */}
            <div className="card p-6 md:p-8 mb-6">
                <h2 className="section-header mb-4">Zubereitung</h2>
                <textarea
                    value={recipeInstructions}
                    onChange={(e) => setRecipeInstructions(e.target.value)}
                    className="input textarea-auto min-h-[200px]"
                    placeholder="Beschreibe hier die Zubereitung Schritt fuer Schritt...&#10;&#10;Tipp: Du kannst Markdown verwenden fuer Formatierung."
                    rows={8}
                />
            </div>

            {/* Submit Error */}
            {errors.submit && (
                <div className="bg-error/10 border border-error/20 rounded-xl p-4 mb-6 text-center">
                    <p className="text-error font-medium">{errors.submit}</p>
                </div>
            )}

            {/* Spacer for floating buttons */}
            <div className="h-24 md:h-20"/>

            {/* Floating Action Buttons */}
            <div
                className="
                    fixed z-50
                    bottom-0 left-0 right-0
                    px-4 py-3
                    bg-white/90 backdrop-blur-lg
                    border-t border-gray-200
                    md:bottom-6 md:right-6 md:left-auto
                    md:px-0 md:py-0
                    md:bg-transparent md:backdrop-blur-none
                    md:border-0
                    transition-all duration-300 ease-out
                "
                role="group"
                aria-label="Formular-Aktionen"
            >
                <div
                    className="
                        flex items-center gap-3 justify-end
                        md:bg-white md:rounded-2xl
                        md:shadow-lg md:shadow-gray-900/10
                        md:border md:border-gray-100
                        md:px-3 md:py-3
                    "
                >
                    {/* Cancel Button */}
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="
                            px-5 py-2.5 rounded-xl
                            text-sm font-semibold
                            text-gray-600
                            bg-gray-100 hover:bg-gray-200
                            transition-all duration-150
                            focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                            active:scale-[0.98]
                        "
                    >
                        Abbrechen
                    </button>

                    {/* Save Button */}
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="
                            px-6 py-2.5 rounded-xl
                            text-sm font-semibold text-white
                            bg-primary hover:bg-primary-hover
                            shadow-md shadow-primary/25
                            transition-all duration-150
                            disabled:opacity-70 disabled:cursor-not-allowed
                            hover:shadow-lg hover:shadow-primary/30
                            hover:-translate-y-0.5
                            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                            active:scale-[0.98]
                            flex items-center gap-2
                        "
                    >
                        {isSaving ? (
                            <>
                                <span
                                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                Speichern...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSave} className="w-4 h-4"/>
                                {isEditing ? 'Speichern' : 'Erstellen'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </form>
    );
}
