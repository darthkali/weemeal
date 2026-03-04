'use client';

import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faLeaf, faSun, faCloudSun, faSnowflake, faAdjust} from '@fortawesome/free-solid-svg-icons';

const SEASON_CONFIG = {
    'Frühling': {icon: faLeaf, color: 'text-green-600', bg: 'bg-green-100 border border-green-200', textColor: 'text-green-700'},
    'Sommer': {icon: faSun, color: 'text-amber-600', bg: 'bg-amber-100 border border-amber-200', textColor: 'text-amber-700'},
    'Herbst': {icon: faCloudSun, color: 'text-orange-600', bg: 'bg-orange-100 border border-orange-200', textColor: 'text-orange-700'},
    'Winter': {icon: faSnowflake, color: 'text-sky-600', bg: 'bg-sky-100 border border-sky-200', textColor: 'text-sky-700'},
} as const;

const ALL_SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'];

interface SeasonBadgeProps {
    seasons?: string[];
    compact?: boolean;
    showContext?: boolean;
}

/**
 * Format seasons list into readable text: "Sommer und Herbst" or "Sommer, Herbst und Winter"
 */
function formatSeasonsList(seasons: string[]): string {
    if (seasons.length === 1) return seasons[0];
    if (seasons.length === 2) return `${seasons[0]} und ${seasons[1]}`;
    const lastSeason = seasons[seasons.length - 1];
    const otherSeasons = seasons.slice(0, -1).join(', ');
    return `${otherSeasons} und ${lastSeason}`;
}

export default function SeasonBadge({seasons = ALL_SEASONS, compact = false, showContext = false}: SeasonBadgeProps) {
    // Empty seasons = mixed/conflicting seasons (no common season found)
    const isMixedSeasons = seasons.length === 0;

    // If all seasons, show "Ganzjährig" or skip in compact mode
    const isAllSeasons = !isMixedSeasons && ALL_SEASONS.every(s => seasons.includes(s));

    // Mixed seasons - ingredients from different seasons with no overlap
    if (isMixedSeasons) {
        if (compact) {
            return (
                <span
                    className="w-5 h-5 rounded-full bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center"
                    title="Gemischte Saison - Zutaten aus verschiedenen Saisons"
                >
                    <FontAwesomeIcon icon={faAdjust} className="w-2.5 h-2.5 text-gray-400"/>
                </span>
            );
        }
        return (
            <div>
                <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 border border-dashed border-gray-300 text-gray-600 text-xs font-medium"
                    title="Enthält Zutaten aus verschiedenen Saisons"
                >
                    <FontAwesomeIcon icon={faAdjust} className="w-3 h-3 text-gray-400"/>
                    Gemischte Saison
                </span>
                {showContext && (
                    <p className="text-xs text-text-muted mt-1">
                        Enthält Zutaten aus verschiedenen Saisons. Nicht alle sind gleichzeitig regional verfügbar.
                    </p>
                )}
            </div>
        );
    }

    if (isAllSeasons) {
        if (compact) return null;
        return (
            <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-700 text-xs font-medium">
                    Ganzjährig
                </span>
                {showContext && (
                    <p className="text-xs text-text-muted mt-1">
                        Alle Zutaten sind ganzjährig verfügbar.
                    </p>
                )}
            </div>
        );
    }

    if (compact) {
        // Show only icons in a row
        return (
            <div className="flex items-center gap-0.5">
                {seasons.map((season) => {
                    const config = SEASON_CONFIG[season as keyof typeof SEASON_CONFIG];
                    if (!config) return null;
                    return (
                        <span
                            key={season}
                            className={`w-5 h-5 rounded-full ${config.bg} flex items-center justify-center`}
                            title={season}
                        >
                            <FontAwesomeIcon icon={config.icon} className={`w-2.5 h-2.5 ${config.color}`}/>
                        </span>
                    );
                })}
            </div>
        );
    }

    // Full display with labels
    return (
        <div>
            <div className="flex flex-wrap gap-1.5">
                {seasons.map((season) => {
                    const config = SEASON_CONFIG[season as keyof typeof SEASON_CONFIG];
                    if (!config) return null;
                    return (
                        <span
                            key={season}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg ${config.bg} text-xs font-medium`}
                        >
                            <FontAwesomeIcon icon={config.icon} className={`w-3 h-3 ${config.color}`}/>
                            <span className={config.textColor}>{season}</span>
                        </span>
                    );
                })}
            </div>
            {showContext && (
                <p className="text-xs text-text-muted mt-1">
                    Beste Verfügbarkeit der Zutaten im {formatSeasonsList(seasons)}.
                </p>
            )}
        </div>
    );
}
