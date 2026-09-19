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

export function isIngredient(content: IngredientListContent): content is Ingredient {
    return content.contentType === 'INGREDIENT';
}

export function isSectionCaption(content: IngredientListContent): content is SectionCaption {
    return content.contentType === 'SECTION_CAPTION';
}

// Source: the optional provenance of a recipe. Exactly one variant, or none.
export interface UrlSource {
    type: 'url';
    url: string;
}

export interface BookSource {
    type: 'book';
    bookTitle: string;
    bookPage?: string;
}

export interface TextSource {
    type: 'text';
    text: string;
}

export type RecipeSource = UrlSource | BookSource | TextSource;

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
