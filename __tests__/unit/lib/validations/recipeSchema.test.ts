import {describe, expect, it} from 'vitest';
import {
    IngredientSchema,
    RecipeInputSchema,
    RecipeSourceSchema,
    RecipeUpdateSchema,
    SectionCaptionSchema,
    validateRecipeInput,
    validateRecipeUpdate,
} from '@/lib/validations/recipeSchema';

describe('RecipeInputSchema', () => {
    it('should validate a valid recipe', () => {
        const validRecipe = {
            name: 'Spaghetti Bolognese',
            recipeYield: 4,
            recipeInstructions: 'Kochen...',
            ingredientListContent: [
                {
                    contentId: 'ing-1',
                    contentType: 'INGREDIENT' as const,
                    position: 0,
                    ingredientName: 'Spaghetti',
                    amount: 500,
                    unit: 'g',
                },
            ],
        };

        const result = RecipeInputSchema.safeParse(validRecipe);
        expect(result.success).toBe(true);
    });

    it('should reject empty recipe name', () => {
        const invalidRecipe = {
            name: '',
            recipeYield: 4,
            recipeInstructions: 'Test',
        };

        const result = RecipeInputSchema.safeParse(invalidRecipe);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toContain('name');
        }
    });

    it('should reject name longer than 200 characters', () => {
        const invalidRecipe = {
            name: 'a'.repeat(201),
            recipeYield: 4,
            recipeInstructions: 'Test',
        };

        const result = RecipeInputSchema.safeParse(invalidRecipe);
        expect(result.success).toBe(false);
    });

    it('should reject recipeYield less than 1', () => {
        const invalidRecipe = {
            name: 'Test',
            recipeYield: 0,
            recipeInstructions: 'Test',
        };

        const result = RecipeInputSchema.safeParse(invalidRecipe);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues[0].path).toContain('recipeYield');
        }
    });

    it('should reject recipeYield greater than 100', () => {
        const invalidRecipe = {
            name: 'Test',
            recipeYield: 101,
            recipeInstructions: 'Test',
        };

        const result = RecipeInputSchema.safeParse(invalidRecipe);
        expect(result.success).toBe(false);
    });

    it('should default ingredientListContent to empty array', () => {
        const recipe = {
            name: 'Test',
            recipeYield: 4,
            recipeInstructions: 'Test',
        };

        const result = RecipeInputSchema.safeParse(recipe);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.ingredientListContent).toEqual([]);
        }
    });

    it('should default recipeInstructions to empty string', () => {
        const recipe = {
            name: 'Test',
            recipeYield: 4,
        };

        const result = RecipeInputSchema.safeParse(recipe);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.recipeInstructions).toBe('');
        }
    });
});

describe('IngredientSchema', () => {
    it('should validate a valid ingredient', () => {
        const ingredient = {
            contentId: 'ing-1',
            contentType: 'INGREDIENT' as const,
            position: 0,
            ingredientName: 'Tomaten',
            amount: 5,
            unit: 'Stück',
        };

        const result = IngredientSchema.safeParse(ingredient);
        expect(result.success).toBe(true);
    });

    it('should reject ingredient without name', () => {
        const ingredient = {
            contentId: 'ing-1',
            contentType: 'INGREDIENT' as const,
            position: 0,
            ingredientName: '',
            amount: 5,
        };

        const result = IngredientSchema.safeParse(ingredient);
        expect(result.success).toBe(false);
    });

    it('should allow ingredient without amount and unit', () => {
        const ingredient = {
            contentId: 'ing-1',
            contentType: 'INGREDIENT' as const,
            position: 0,
            ingredientName: 'Salz',
        };

        const result = IngredientSchema.safeParse(ingredient);
        expect(result.success).toBe(true);
    });
});

describe('SectionCaptionSchema', () => {
    it('should validate a valid section caption', () => {
        const section = {
            contentId: 'sec-1',
            contentType: 'SECTION_CAPTION' as const,
            position: 0,
            sectionName: 'Sauce',
        };

        const result = SectionCaptionSchema.safeParse(section);
        expect(result.success).toBe(true);
    });

    it('should reject section caption without name', () => {
        const section = {
            contentId: 'sec-1',
            contentType: 'SECTION_CAPTION' as const,
            position: 0,
            sectionName: '',
        };

        const result = SectionCaptionSchema.safeParse(section);
        expect(result.success).toBe(false);
    });
});

describe('RecipeSourceSchema', () => {
    it('should accept a text source', () => {
        const result = RecipeSourceSchema.safeParse({type: 'text', text: 'Rezept meiner Oma'});
        expect(result.success).toBe(true);
    });

    it('should reject a text source without text', () => {
        const result = RecipeSourceSchema.safeParse({type: 'text'});
        expect(result.success).toBe(false);
    });

    it('should accept a book source with title', () => {
        const result = RecipeSourceSchema.safeParse({type: 'book', bookTitle: 'Grundkochbuch', bookPage: 'S. 42'});
        expect(result.success).toBe(true);
    });

    it('should reject a book source without title', () => {
        const result = RecipeSourceSchema.safeParse({type: 'book'});
        expect(result.success).toBe(false);
    });

    it('should accept a url source with url', () => {
        const result = RecipeSourceSchema.safeParse({type: 'url', url: 'https://example.com'});
        expect(result.success).toBe(true);
    });

    it('should reject a url source without url', () => {
        const result = RecipeSourceSchema.safeParse({type: 'url'});
        expect(result.success).toBe(false);
    });
});

describe('RecipeUpdateSchema', () => {
    it('should allow partial updates', () => {
        const update = {name: 'New Name'};

        const result = RecipeUpdateSchema.safeParse(update);
        expect(result.success).toBe(true);
    });

    it('should reject empty update', () => {
        const update = {};

        const result = RecipeUpdateSchema.safeParse(update);
        expect(result.success).toBe(false);
    });
});

describe('validateRecipeInput', () => {
    it('should return success for valid input', () => {
        const input = {
            name: 'Test',
            recipeYield: 4,
            recipeInstructions: 'Instructions',
        };

        const result = validateRecipeInput(input);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
    });

    it('should return errors for invalid input', () => {
        const input = {
            name: '',
            recipeYield: -1,
        };

        const result = validateRecipeInput(input);
        expect(result.success).toBe(false);
        expect(result.errors).toBeDefined();
    });
});

describe('validateRecipeUpdate', () => {
    it('should return success for valid update', () => {
        const input = {name: 'Updated Name'};

        const result = validateRecipeUpdate(input);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
    });
});
