'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faArrowLeft, faEdit, faShareNodes, faTrash} from '@fortawesome/free-solid-svg-icons';
import {RecipeResponse} from '@/types/recipe';
import DeleteDialog from '@/components/ui/DeleteDialog';
import RecipeContent from '@/components/recipe/RecipeContent';
import RecipeNotes from '@/components/recipe/RecipeNotes';
import ShareDialog from '@/components/recipe/ShareDialog';

interface RecipeDetailViewProps {
    recipe: RecipeResponse;
    // Share Links gibt es nur mit Zugangsschutz, nicht in einer Open Instance.
    canShare?: boolean;
}

export default function RecipeDetailView({recipe, canShare = false}: RecipeDetailViewProps) {
    const router = useRouter();
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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

            <RecipeContent
                recipe={recipe}
                portionsStorageKey={`recipe-portions-${recipe._id}`}
                bringRecipePath={`/api/recipes/bring/${recipe._id}`}
                actions={
                    <>
                        {canShare && (
                            <button
                                onClick={() => setShowShareDialog(true)}
                                className="w-10 h-10 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center hover:bg-white transition-colors"
                                aria-label="Teilen"
                            >
                                <FontAwesomeIcon icon={faShareNodes} className="w-4 h-4 text-text-dark"/>
                            </button>
                        )}
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
                    </>
                }
            >
                {/* Notes Section */}
                <RecipeNotes recipeId={recipe._id} initialNotes={recipe.notes || ''}/>
            </RecipeContent>

            {canShare && (
                <ShareDialog
                    recipeId={recipe._id}
                    isOpen={showShareDialog}
                    onClose={() => setShowShareDialog(false)}
                />
            )}

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
