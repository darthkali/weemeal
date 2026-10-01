'use client';

import {useCallback, useState} from 'react';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faSearch, faTimes} from '@fortawesome/free-solid-svg-icons';

interface RecipeSearchBarProps {
    onSearch: (query: string) => void;
    placeholder?: string;
}

export default function RecipeSearchBar({
                                            onSearch,
                                            placeholder = 'Rezept suchen...',
                                        }: RecipeSearchBarProps) {
    const [query, setQuery] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value;
            setQuery(value);
            onSearch(value);
        },
        [onSearch]
    );

    const handleClear = useCallback(() => {
        setQuery('');
        onSearch('');
    }, [onSearch]);

    return (
        <div className={`relative transition-all duration-200 ${isFocused ? 'scale-[1.02]' : ''}`}>
            {/* Search Icon */}
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <FontAwesomeIcon
                    icon={faSearch}
                    className={`w-4 h-4 transition-colors duration-200 ${
                        isFocused ? 'text-primary' : 'text-gray-400'
                    }`}
                />
            </div>

            {/* Input */}
            <input
                type="text"
                value={query}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="w-full pl-11 pr-10 py-3 bg-white border-2 border-gray-100 rounded-xl text-text-dark placeholder:text-gray-400 focus:outline-hidden focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all duration-200"
            />

            {/* Clear Button */}
            {query && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center group"
                >
                    <div
                        className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition-colors">
                        <FontAwesomeIcon icon={faTimes} className="w-3 h-3 text-gray-500"/>
                    </div>
                </button>
            )}
        </div>
    );
}
