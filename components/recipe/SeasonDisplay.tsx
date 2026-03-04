'use client';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faCalendarAlt, faSyncAlt, faSpinner} from '@fortawesome/free-solid-svg-icons';
import SeasonBadge from './SeasonBadge';

interface SeasonDisplayProps {
    seasons?: string[];
    isRegenerating: boolean;
    onRegenerate: () => void;
    hasIngredients: boolean;
    isNewRecipe: boolean;
}

export default function SeasonDisplay({
    seasons,
    isRegenerating,
    onRegenerate,
    hasIngredients,
    isNewRecipe,
}: SeasonDisplayProps) {
    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-text-dark">
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 mr-1.5 text-text-muted"/>
                    Saisons
                </label>
                {!isNewRecipe && (
                    <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={isRegenerating || !hasIngredients}
                        className="text-xs font-medium text-primary hover:text-primary-hover disabled:text-gray-400 flex items-center gap-1.5 transition-colors"
                    >
                        {isRegenerating ? (
                            <>
                                <FontAwesomeIcon icon={faSpinner} className="w-3 h-3 animate-spin"/>
                                Berechne...
                            </>
                        ) : (
                            <>
                                <FontAwesomeIcon icon={faSyncAlt} className="w-3 h-3"/>
                                Neu berechnen
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Season Badges */}
            <div className="mb-2">
                {seasons && seasons.length > 0 ? (
                    <SeasonBadge seasons={seasons}/>
                ) : (
                    <span className="text-sm text-text-muted">
                        {isNewRecipe ? 'Wird beim Speichern berechnet' : 'Keine Saisons'}
                    </span>
                )}
            </div>

            {/* Info Text */}
            <p className="text-xs text-text-muted">
                {isNewRecipe
                    ? 'Wird automatisch ermittelt basierend auf saisonalen Zutaten – du musst nichts eingeben.'
                    : 'Automatisch ermittelt basierend auf saisonalen Zutaten. Wird beim Speichern aktualisiert.'}
            </p>
        </div>
    );
}
