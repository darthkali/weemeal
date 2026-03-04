'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faLeaf,
    faSun,
    faCloudSun,
    faSnowflake,
    faCalendarAlt,
    faCheck,
    faChevronDown,
    faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Season } from '@/types/recipe';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

// Filter options type
type SeasonFilterOption = 'all' | 'current' | Season;

interface SeasonConfig {
    icon: IconDefinition;
    label: string;
    color: string;
    bgActive: string;
    bgHover: string;
}

const SEASON_CONFIG: Record<Season, SeasonConfig> = {
    'Frühling': {
        icon: faLeaf,
        label: 'Frühling',
        color: 'text-green-600',
        bgActive: 'bg-green-50',
        bgHover: 'hover:bg-green-50',
    },
    'Sommer': {
        icon: faSun,
        label: 'Sommer',
        color: 'text-amber-500',
        bgActive: 'bg-amber-50',
        bgHover: 'hover:bg-amber-50',
    },
    'Herbst': {
        icon: faCloudSun,
        label: 'Herbst',
        color: 'text-orange-500',
        bgActive: 'bg-orange-50',
        bgHover: 'hover:bg-orange-50',
    },
    'Winter': {
        icon: faSnowflake,
        label: 'Winter',
        color: 'text-blue-500',
        bgActive: 'bg-blue-50',
        bgHover: 'hover:bg-blue-50',
    },
};

const ORDERED_SEASONS: Season[] = ['Frühling', 'Sommer', 'Herbst', 'Winter'];

interface SeasonSelectorProps {
    value: SeasonFilterOption;
    onChange: (value: SeasonFilterOption) => void;
    currentSeason: Season;
}

export default function SeasonSelector({
    value,
    onChange,
    currentSeason,
}: SeasonSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            } else if (event.key === 'Enter' || event.key === ' ') {
                if (!isOpen) {
                    event.preventDefault();
                    setIsOpen(true);
                }
            }
        },
        [isOpen]
    );

    const handleSelect = (option: SeasonFilterOption) => {
        onChange(option);
        setIsOpen(false);
        buttonRef.current?.focus();
    };

    const handleReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('all');
    };

    // Determine display state
    const getDisplayInfo = (): { icon: IconDefinition; label: string; isFiltered: boolean; colorClass: string; bgClass: string } => {
        if (value === 'all') {
            return {
                icon: faCalendarAlt,
                label: 'Alle Saisons',
                isFiltered: false,
                colorClass: 'text-gray-500',
                bgClass: 'bg-white',
            };
        }
        // Map 'current' to actual current season
        const season = value === 'current' ? currentSeason : value;
        const config = SEASON_CONFIG[season];
        return {
            icon: config.icon,
            label: config.label,
            isFiltered: true,
            colorClass: config.color,
            bgClass: config.bgActive,
        };
    };

    const displayInfo = getDisplayInfo();

    return (
        <div ref={dropdownRef} className="relative inline-block">
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onKeyDown={handleKeyDown}
                className={`
                    group flex items-center gap-2 px-3 py-2 rounded-xl
                    border transition-all duration-150
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1
                    ${displayInfo.isFiltered
                        ? `${displayInfo.bgClass} border-transparent shadow-sm`
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                `}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label="Saison-Filter"
            >
                <FontAwesomeIcon
                    icon={displayInfo.icon}
                    className={`w-4 h-4 ${displayInfo.colorClass}`}
                />
                <span className={`text-sm font-medium ${displayInfo.isFiltered ? 'text-gray-700' : 'text-gray-600'}`}>
                    {displayInfo.label}
                </span>

                {/* Reset button when filtered */}
                {displayInfo.isFiltered ? (
                    <span
                        role="button"
                        tabIndex={0}
                        onClick={handleReset}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleReset(e as unknown as React.MouseEvent); }}
                        className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
                        aria-label="Filter zurücksetzen"
                    >
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-gray-400" />
                    </span>
                ) : (
                    <FontAwesomeIcon
                        icon={faChevronDown}
                        className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    />
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className="
                        absolute left-0 mt-2 w-56 py-1
                        bg-white rounded-xl shadow-lg border border-gray-100
                        z-50 animate-fade-in
                        origin-top-left
                    "
                    role="listbox"
                    aria-label="Saison auswählen"
                >
                    {/* All Seasons Option */}
                    <DropdownOption
                        icon={faCalendarAlt}
                        label="Alle Saisons"
                        isSelected={value === 'all'}
                        onClick={() => handleSelect('all')}
                        colorClass="text-gray-500"
                        bgHover="hover:bg-gray-50"
                    />

                    {/* Divider */}
                    <div className="my-1 border-t border-gray-100" />

                    {/* Individual Seasons */}
                    {ORDERED_SEASONS.map((season) => {
                        const config = SEASON_CONFIG[season];
                        const isCurrent = season === currentSeason;
                        return (
                            <DropdownOption
                                key={season}
                                icon={config.icon}
                                label={config.label}
                                isSelected={value === season || (value === 'current' && isCurrent)}
                                onClick={() => handleSelect(season)}
                                colorClass={config.color}
                                bgHover={config.bgHover}
                                highlight={isCurrent}
                                sublabel={isCurrent ? 'aktuell' : undefined}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Dropdown Option Component
interface DropdownOptionProps {
    icon: IconDefinition;
    label: string;
    sublabel?: string;
    isSelected: boolean;
    onClick: () => void;
    colorClass: string;
    bgHover: string;
    highlight?: boolean;
}

function DropdownOption({
    icon,
    label,
    sublabel,
    isSelected,
    onClick,
    colorClass,
    bgHover,
    highlight,
}: DropdownOptionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-left
                transition-colors duration-100
                ${bgHover}
                ${isSelected ? 'bg-gray-50' : ''}
                ${highlight ? 'border-l-2 border-primary' : ''}
            `}
            role="option"
            aria-selected={isSelected}
        >
            {/* Icon */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                <FontAwesomeIcon icon={icon} className={`w-4 h-4 ${colorClass}`} />
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-700">{label}</div>
                {sublabel && (
                    <div className="text-xs text-gray-400">{sublabel}</div>
                )}
            </div>

            {/* Check mark */}
            {isSelected && (
                <FontAwesomeIcon icon={faCheck} className="w-4 h-4 text-primary flex-shrink-0" />
            )}
        </button>
    );
}
