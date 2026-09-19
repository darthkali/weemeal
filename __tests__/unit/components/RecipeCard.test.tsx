import {describe, expect, it} from 'vitest';
import {render, screen} from '@testing-library/react';
import RecipeCard from '@/components/recipe/RecipeCard';
import {RecipeResponse} from '@/types/recipe';

describe('RecipeCard', () => {
    const mockRecipe: RecipeResponse = {
        _id: '123',
        name: 'Spaghetti Bolognese',
        recipeYield: 4,
        recipeInstructions: 'Cook the pasta...',
        ingredientListContent: [
            {
                contentId: 'ing-1',
                contentType: 'INGREDIENT',
                position: 0,
                ingredientName: 'Spaghetti',
                amount: 500,
                unit: 'g',
            },
            {
                contentId: 'ing-2',
                contentType: 'INGREDIENT',
                position: 1,
                ingredientName: 'Tomatoes',
                amount: 400,
                unit: 'g',
            },
            {
                contentId: 'sec-1',
                contentType: 'SECTION_CAPTION',
                position: 2,
                sectionName: 'Sauce',
            },
        ],
    };

    it('should render recipe name', () => {
        render(<RecipeCard recipe={mockRecipe}/>);
        expect(screen.getByText('Spaghetti Bolognese')).toBeInTheDocument();
    });

    it('should render portion count', () => {
        render(<RecipeCard recipe={mockRecipe}/>);
        expect(screen.getByText('4 Portionen')).toBeInTheDocument();
    });

    it('should render ingredient count (excluding sections)', () => {
        render(<RecipeCard recipe={mockRecipe}/>);
        // Should count only INGREDIENT items, not SECTION_CAPTION
        expect(screen.getByText('2 Zutaten')).toBeInTheDocument();
    });

    it('should link to recipe detail page', () => {
        render(<RecipeCard recipe={mockRecipe}/>);
        const link = screen.getByRole('link');
        expect(link).toHaveAttribute('href', '/recipe/123');
    });

    it('should handle recipe with no ingredients', () => {
        const emptyRecipe: RecipeResponse = {
            _id: '456',
            name: 'Empty Recipe',
            recipeYield: 2,
            recipeInstructions: '',
            ingredientListContent: [],
        };

        render(<RecipeCard recipe={emptyRecipe}/>);
        expect(screen.getByText('0 Zutaten')).toBeInTheDocument();
    });
});
