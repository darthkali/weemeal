'use client';

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faBookOpen, faPlus} from '@fortawesome/free-solid-svg-icons';
import {RecipeResponse, Season} from '@/types/recipe';
import RecipeGrid from '@/components/recipe/RecipeGrid';
import RecipeSearchBar from '@/components/recipe/RecipeSearchBar';
import SeasonSelector from '@/components/recipe/SeasonSelector';

const ALL_SEASONS: Season[] = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
const STORAGE_KEY_SEASON_FILTER = 'weemeal-season-filter-v2';

type SeasonFilterOption = 'all' | 'current' | Season;

function getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return 'Frühling';
    if (month >= 6 && month <= 8) return 'Sommer';
    if (month >= 9 && month <= 11) return 'Herbst';
    return 'Winter';
}

function loadSeasonFilterFromStorage(): SeasonFilterOption {
    if (typeof window === 'undefined') return 'all';
    try {
        const stored = localStorage.getItem(STORAGE_KEY_SEASON_FILTER);
        if (stored) {
            // Validate the stored value
            if (stored === 'all' || stored === 'current' || ALL_SEASONS.includes(stored as Season)) {
                return stored as SeasonFilterOption;
            }
        }
    } catch {
        // Ignore storage errors
    }
    return 'all';
}

function saveSeasonFilterToStorage(value: SeasonFilterOption): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_SEASON_FILTER, value);
    } catch {
        // Ignore storage errors
    }
}

export default function HomePage() {
    const [recipes, setRecipes] = useState<RecipeResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [seasonFilter, setSeasonFilter] = useState<SeasonFilterOption>('all');
    const [currentSeason] = useState<Season>(getCurrentSeason);
    const [filterInitialized, setFilterInitialized] = useState(false);
    const hasFetchedOnce = useRef(false);

    const fetchRecipes = useCallback(async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const response = await fetch('/api/recipes', {
                cache: 'no-store',
            });
            if (!response.ok) {
                throw new Error('Failed to fetch recipes');
            }
            const data = await response.json();
            setRecipes(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchRecipes();
        hasFetchedOnce.current = true;
    }, [fetchRecipes]);

    // Load filter state from localStorage on mount
    useEffect(() => {
        const storedFilter = loadSeasonFilterFromStorage();
        setSeasonFilter(storedFilter);
        setFilterInitialized(true);
    }, []);

    // Save filter state to localStorage when it changes
    useEffect(() => {
        if (!filterInitialized) return;
        saveSeasonFilterToStorage(seasonFilter);
    }, [seasonFilter, filterInitialized]);

    // Re-fetch when page becomes visible (user navigates back)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && hasFetchedOnce.current) {
                fetchRecipes(false); // Don't show loading spinner for background refresh
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchRecipes]);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
    }, []);

    const handleSeasonFilterChange = useCallback((value: SeasonFilterOption) => {
        setSeasonFilter(value);
    }, []);

    const filteredRecipes = useMemo(() => {
        let filtered = recipes;

        // Filter by search query
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            filtered = filtered.filter((recipe) => {
                if (recipe.name.toLowerCase().includes(lowerQuery)) {
                    return true;
                }
                if (recipe.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                    return true;
                }
                return false;
            });
        }

        // Filter by season
        if (seasonFilter !== 'all') {
            const targetSeason = seasonFilter === 'current' ? currentSeason : seasonFilter;
            filtered = filtered.filter((recipe) => {
                const recipeSeasons = recipe.seasons || ALL_SEASONS;
                return recipeSeasons.includes(targetSeason);
            });
        }

        return filtered;
    }, [recipes, searchQuery, seasonFilter, currentSeason]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="spinner"/>
                <p className="text-text-muted text-sm animate-pulse-subtle">Rezepte werden geladen...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="empty-state">
                <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">!</span>
                </div>
                <h2 className="empty-state-title">Etwas ist schiefgelaufen</h2>
                <p className="empty-state-description">Fehler: {error}</p>
                <button
                    onClick={() => window.location.reload()}
                    className="btn btn-primary"
                >
                    Erneut versuchen
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <div
                className="relative overflow-hidden bg-gradient-to-br from-primary-subtle from-10% via-white via-50% to-secondary-subtle rounded-3xl p-8 md:p-12 shadow-lg shadow-black/5">
                {/* Decorative elements - green top left */}
                <div
                    className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-y-1/3 -translate-x-1/3"/>
                {/* Orange bottom right */}
                <div
                    className="absolute bottom-0 right-0 w-48 h-48 bg-secondary/20 rounded-full blur-3xl translate-y-1/4 translate-x-1/4"/>

                <div
                    className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FontAwesomeIcon icon={faBookOpen} className="w-4 h-4 text-primary"/>
                            </div>
                            <span className="text-sm font-medium text-primary">Rezeptsammlung</span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-text-dark tracking-tight">
                            Meine Rezepte
                        </h1>
                        <p className="text-text-muted max-w-md">
                            {recipes.length === 0
                                ? 'Starte deine Rezeptsammlung und speichere deine Lieblingsgerichte.'
                                : `${recipes.length} Rezept${recipes.length !== 1 ? 'e' : ''} in deiner Sammlung`
                            }
                        </p>
                    </div>

                    <Link href="/recipe/new" className="btn btn-primary shadow-lg">
                        <FontAwesomeIcon icon={faPlus} className="w-4 h-4"/>
                        Neues Rezept
                    </Link>
                </div>
            </div>

            {/* Search & Filter Section */}
            {recipes.length > 0 && (
                <div className="space-y-3">
                    {/* Filter Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1 max-w-lg">
                            <RecipeSearchBar onSearch={handleSearch}/>
                        </div>

                        {/* Season Filter */}
                        <SeasonSelector
                            value={seasonFilter}
                            onChange={handleSeasonFilterChange}
                            currentSeason={currentSeason}
                        />
                    </div>

                    {/* Results Context - nur bei aktivem Filter */}
                    {(searchQuery || seasonFilter !== 'all') && (
                        <p className="text-sm text-text-muted">
                            <span className="font-medium text-text-dark">{filteredRecipes.length}</span>
                            {' '}von{' '}
                            <span>{recipes.length}</span>
                            {' '}{recipes.length === 1 ? 'Rezept' : 'Rezepten'}
                            {searchQuery && (
                                <>
                                    {' '}für{' '}
                                    <span className="font-medium text-text-dark">&quot;{searchQuery}&quot;</span>
                                </>
                            )}
                            {seasonFilter !== 'all' && (
                                <>
                                    {' '}passend für{' '}
                                    <span className="font-medium text-text-dark">
                                        {seasonFilter === 'current' ? currentSeason : seasonFilter}
                                    </span>
                                </>
                            )}
                        </p>
                    )}
                </div>
            )}

            {/* Recipe Grid */}
            <RecipeGrid recipes={filteredRecipes}/>
        </div>
    );
}
