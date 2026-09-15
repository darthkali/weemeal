import {ObjectId} from 'mongodb';

export type ContentType = 'INGREDIENT' | 'SECTION_CAPTION';

export interface BaseContent {
    contentId: string;
    contentType: ContentType;
    position: number;
}

export interface Ingredient extends BaseContent {
    contentType: 'INGREDIENT';
    ingredientName: string;
    unit?: string;
    amount?: number;
}

export interface SectionCaption extends BaseContent {
    contentType: 'SECTION_CAPTION';
    sectionName: string;
}

export type IngredientListContent = Ingredient | SectionCaption;

export interface RecipeSource {
    type: 'book' | 'url';
    bookTitle?: string;
    bookPage?: string;
    url?: string;
}

export interface Recipe {
    _id?: ObjectId | string;
    name: string;
    recipeYield: number;
    recipeInstructions: string;
    ingredientListContent: IngredientListContent[];
    imageUrl?: string;
    tags?: string[];
    notes?: string;
    source?: RecipeSource;
    userId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface RecipeDocument extends Omit<Recipe, '_id'> {
    _id: ObjectId;
}

// For API responses (serialized)
export interface RecipeResponse extends Omit<Recipe, '_id' | 'createdAt' | 'updatedAt'> {
    _id: string;
    imageUrl?: string;
    tags?: string[];
    notes?: string;
    source?: RecipeSource;
    createdAt?: string;
    updatedAt?: string;
}

// For creating/updating recipes
export interface RecipeInput {
    name: string;
    recipeYield: number;
    recipeInstructions: string;
    ingredientListContent: IngredientListContent[];
    userId?: string;
}

// Legacy format compatibility (from old React app)
export interface LegacyRecipe {
    recipeId: string;
    name: string;
    recipeYield: number;
    recipeInstructions: string;
    ingredientListContent: IngredientListContent[];
}
