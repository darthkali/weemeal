import {connectToDatabase} from '../connection';
import Recipe, {IIngredientListContent, IRecipeDocument} from '../models/Recipe';
import mongoose from 'mongoose';

export interface RecipeSourceInput {
    type: 'book' | 'url';
    bookTitle?: string;
    bookPage?: string;
    url?: string;
}

export interface CreateRecipeInput {
    name: string;
    recipeYield: number;
    recipeInstructions: string;
    ingredientListContent?: IIngredientListContent[];
    imageUrl?: string;
    tags?: string[];
    notes?: string;
    source?: RecipeSourceInput | null;
    userId?: string;
}

export interface UpdateRecipeInput extends Partial<CreateRecipeInput> {
    imageUrl?: string;
    tags?: string[];
    notes?: string;
    source?: RecipeSourceInput | null;
}

export class RecipeRepository {
    private async ensureConnection(): Promise<void> {
        await connectToDatabase();
    }

    async create(data: CreateRecipeInput): Promise<IRecipeDocument> {
        await this.ensureConnection();
        const recipe = new Recipe({
            ...data,
            ingredientListContent: data.ingredientListContent || [],
        });
        return recipe.save();
    }

    async findAll(userId?: string): Promise<IRecipeDocument[]> {
        await this.ensureConnection();
        const query = userId ? {userId} : {};
        return Recipe.find(query).sort({createdAt: -1}).exec();
    }

    async findById(id: string): Promise<IRecipeDocument | null> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }

        return Recipe.findById(id).exec();
    }

    async update(id: string, data: UpdateRecipeInput): Promise<IRecipeDocument | null> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }

        return Recipe.findByIdAndUpdate(
            id,
            {$set: data},
            {returnDocument: 'after', runValidators: true}
        ).exec();
    }

    async delete(id: string): Promise<boolean> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return false;
        }

        const result = await Recipe.findByIdAndDelete(id).exec();
        return result !== null;
    }

    async search(query: string, userId?: string): Promise<IRecipeDocument[]> {
        await this.ensureConnection();

        const searchQuery: Record<string, unknown> = {
            $text: {$search: query},
        };

        if (userId) {
            searchQuery.userId = userId;
        }

        return Recipe.find(searchQuery)
            .sort({score: {$meta: 'textScore'}})
            .exec();
    }

    async findByName(name: string, userId?: string): Promise<IRecipeDocument[]> {
        await this.ensureConnection();

        const query: Record<string, unknown> = {
            name: {$regex: name, $options: 'i'},
        };

        if (userId) {
            query.userId = userId;
        }

        return Recipe.find(query).sort({name: 1}).exec();
    }
}

// Singleton instance
export const recipeRepository = new RecipeRepository();
