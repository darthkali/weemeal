import {z} from 'zod';

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

export const RecipeSourceSchema = z.object({
    type: z.enum(['book', 'url']),
    bookTitle: z.string().max(200).optional(),
    bookPage: z.string().max(50).optional(),
    url: z.string().url().max(2000).optional(),
}).refine(
    (data) => {
        if (data.type === 'book') {
            return !!data.bookTitle;
        }
        if (data.type === 'url') {
            return !!data.url;
        }
        return true;
    },
    {message: 'Book title or URL is required based on source type'}
);

export const RecipeInputSchema = z.object({
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
    recipeInstructions: z.string().default(''),
    ingredientListContent: z.array(IngredientListContentSchema).default([]),
    imageUrl: z.string().nullable().optional(),
    tags: z.array(z.string().max(25)).max(10).default([]),
    notes: z.string().max(5000).default(''),
    source: RecipeSourceSchema.nullable().optional(),
    userId: z.string().optional(),
});

export const RecipeUpdateSchema = RecipeInputSchema.partial().refine(
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
