import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Recipe from '@/lib/mongodb/models/Recipe';

// These tests require mongodb-memory-server
// They test the Recipe model directly to avoid connection module issues
describe('Recipe Model', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    }, 60000); // 60 second timeout for MongoMemoryServer startup


    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        await Recipe.deleteMany({});
    });

    describe('create', () => {
        it('should create a new recipe', async () => {
            const recipeData = {
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

            const recipe = new Recipe(recipeData);
            const result = await recipe.save();

            expect(result._id).toBeDefined();
            expect(result.name).toBe('Spaghetti Bolognese');
            expect(result.recipeYield).toBe(4);
            expect(result.ingredientListContent).toHaveLength(1);
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });

        it('should create recipe with empty ingredients', async () => {
            const recipe = new Recipe({
                name: 'Simple Recipe',
                recipeYield: 2,
                recipeInstructions: 'Just do it',
            });

            const result = await recipe.save();
            expect(result.ingredientListContent).toEqual([]);
        });

        it('should reject recipe without name', async () => {
            const recipe = new Recipe({
                name: '',
                recipeYield: 2,
                recipeInstructions: 'Test',
            });

            await expect(recipe.save()).rejects.toThrow();
        });
    });

    describe('findById', () => {
        it('should return null for non-existent recipe', async () => {
            const result = await Recipe.findById('507f1f77bcf86cd799439011');
            expect(result).toBeNull();
        });

        it('should find recipe by id', async () => {
            const recipe = new Recipe({
                name: 'Test Recipe',
                recipeYield: 2,
                recipeInstructions: 'Instructions',
            });
            const created = await recipe.save();

            const result = await Recipe.findById(created._id);

            expect(result).not.toBeNull();
            expect(result?.name).toBe('Test Recipe');
        });
    });

    describe('find', () => {
        it('should return empty array when no recipes', async () => {
            const result = await Recipe.find();
            expect(result).toEqual([]);
        });

        it('should return all recipes', async () => {
            await new Recipe({
                name: 'Recipe 1',
                recipeYield: 2,
                recipeInstructions: '',
            }).save();
            await new Recipe({
                name: 'Recipe 2',
                recipeYield: 4,
                recipeInstructions: '',
            }).save();

            const result = await Recipe.find();

            expect(result).toHaveLength(2);
        });

        it('should filter by userId', async () => {
            await new Recipe({
                name: 'User1 Recipe',
                recipeYield: 2,
                recipeInstructions: '',
                userId: 'user1',
            }).save();
            await new Recipe({
                name: 'User2 Recipe',
                recipeYield: 2,
                recipeInstructions: '',
                userId: 'user2',
            }).save();

            const result = await Recipe.find({userId: 'user1'});

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('User1 Recipe');
        });
    });

    describe('update', () => {
        it('should update recipe name', async () => {
            const recipe = new Recipe({
                name: 'Original Name',
                recipeYield: 2,
                recipeInstructions: '',
            });
            const created = await recipe.save();

            const updated = await Recipe.findByIdAndUpdate(
                created._id,
                {name: 'Updated Name'},
                {returnDocument: 'after'}
            );

            expect(updated?.name).toBe('Updated Name');
            expect(updated?.recipeYield).toBe(2);
        });
    });

    describe('delete', () => {
        it('should delete recipe', async () => {
            const recipe = new Recipe({
                name: 'ToDelete',
                recipeYield: 1,
                recipeInstructions: '',
            });
            const created = await recipe.save();

            const deleted = await Recipe.findByIdAndDelete(created._id);
            expect(deleted).not.toBeNull();

            const found = await Recipe.findById(created._id);
            expect(found).toBeNull();
        });
    });
});
