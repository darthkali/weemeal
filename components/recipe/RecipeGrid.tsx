'use client';

import Link from 'next/link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBookOpen, faPlus} from '@fortawesome/free-solid-svg-icons';
import {RecipeResponse} from '@/types/recipe';
import RecipeCard from './RecipeCard';

interface RecipeGridProps {
    recipes: RecipeResponse[];
}

export default function RecipeGrid({recipes}: RecipeGridProps) {
    if (recipes.length === 0) {
        return (
            <div className="empty-state bg-white rounded-3xl border border-gray-100 shadow-card-sm">
                <div
                    className="w-24 h-24 rounded-2xl bg-linear-to-br from-primary-subtle to-primary/10 flex items-center justify-center mb-6">
                    <FontAwesomeIcon
                        icon={faBookOpen}
                        className="w-12 h-12 text-primary/60"
                    />
                </div>
                <h2 className="empty-state-title">Keine Rezepte gefunden</h2>
                <p className="empty-state-description">
                    Beginne jetzt mit dem Aufbau deiner persoenlichen Rezeptsammlung.
                    Speichere deine Lieblingsgerichte und greife jederzeit darauf zu.
                </p>
                <Link href="/recipe/new" className="btn btn-primary">
                    <FontAwesomeIcon icon={faPlus} className="w-4 h-4"/>
                    Erstes Rezept erstellen
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe, index) => (
                <div key={recipe._id}>
                    <RecipeCard recipe={recipe} priority={index < 8}/>
                </div>
            ))}
        </div>
    );
}
