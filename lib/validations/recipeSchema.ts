import {z} from 'zod';

// Runtime contract for recipe data. Keep structurally in sync with the
// canonical TS shapes in types/recipe.ts.

export const IngredientSchema = z.object({
    contentId: z.string().min(1),
    contentType: z.literal('INGREDIENT'),
    position: z.number().int().min(0),
    ingredientName: z.string().min(1, 'Ingredient name is required'),
    unit: z.string().optional(),
    amount: z.number().min(0).optional(),
});

export const SectionCaptionSchema = z.object({
    contentId: z.string().min(1),
    contentType: z.literal('SECTION_CAPTION'),
    position: z.number().int().min(0),
    sectionName: z.string().min(1, 'Section name is required'),
});

export const IngredientListContentSchema = z.discriminatedUnion('contentType', [
    IngredientSchema,
    SectionCaptionSchema,
]);

export const RecipeSourceSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('url'),
        url: z.string().url().max(2000),
    }),
    z.object({
        type: z.literal('book'),
        bookTitle: z.string().min(1).max(200),
        bookPage: z.string().max(50).optional(),
    }),
    z.object({
        type: z.literal('text'),
        text: z.string().min(1).max(2000),
    }),
]);

// Shared field rules without defaults. RecipeInputSchema adds create-time
// defaults on top; RecipeUpdateSchema uses these as-is so an empty {} update
// parses to {} and is rejected by the refine below.
const recipeBaseShape = {
    name: z
        .string()
        .min(1, 'Recipe name is required')
        .max(200, 'Recipe name cannot exceed 200 characters')
        .trim(),
    recipeYield: z
        .number()
        .int('Recipe yield must be a whole number')
        .min(1, 'Recipe yield must be at least 1')
        .max(100, 'Recipe yield cannot exceed 100'),
    recipeInstructions: z.string(),
    ingredientListContent: z.array(IngredientListContentSchema),
    imageUrl: z.string().nullable().optional(),
    tags: z.array(z.string().max(25)).max(10),
    notes: z.string().max(5000),
    source: RecipeSourceSchema.nullable().optional(),
    userId: z.string().optional(),
};

export const RecipeInputSchema = z.object({
    ...recipeBaseShape,
    recipeInstructions: recipeBaseShape.recipeInstructions.default(''),
    ingredientListContent: recipeBaseShape.ingredientListContent.default([]),
    tags: recipeBaseShape.tags.default([]),
    notes: recipeBaseShape.notes.default(''),
});

export const RecipeUpdateSchema = z.object(recipeBaseShape).partial().refine(
    (data) => Object.keys(data).length > 0,
    {message: 'At least one field must be provided for update'}
);

export type RecipeInput = z.infer<typeof RecipeInputSchema>;
export type RecipeUpdate = z.infer<typeof RecipeUpdateSchema>;
export type IngredientInput = z.infer<typeof IngredientSchema>;
export type SectionCaptionInput = z.infer<typeof SectionCaptionSchema>;
export type IngredientListContentInput = z.infer<typeof IngredientListContentSchema>;

export function validateRecipeInput(data: unknown): {
    success: boolean;
    data?: RecipeInput;
    errors?: z.ZodError;
} {
    const result = RecipeInputSchema.safeParse(data);
    if (result.success) {
        return {success: true, data: result.data};
    }
    return {success: false, errors: result.error};
}

export function validateRecipeUpdate(data: unknown): {
    success: boolean;
    data?: RecipeUpdate;
    errors?: z.ZodError;
} {
    const result = RecipeUpdateSchema.safeParse(data);
    if (result.success) {
        return {success: true, data: result.data};
    }
    return {success: false, errors: result.error};
}
