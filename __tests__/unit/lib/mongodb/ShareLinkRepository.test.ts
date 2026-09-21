import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {MongoMemoryServer} from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Recipe from '@/lib/mongodb/models/Recipe';
import ShareLink from '@/lib/mongodb/models/ShareLink';
import {
    generateShareToken,
    isShareToken,
    shareLinkRepository,
} from '@/lib/mongodb/repositories/ShareLinkRepository';

async function createRecipe(name = 'Spaghetti Bolognese') {
    const recipe = await new Recipe({
        name,
        recipeYield: 4,
        recipeInstructions: 'Kochen...',
        notes: 'Nur für uns',
    }).save();
    return recipe._id.toString();
}

describe('ShareLinkRepository', () => {
    let mongoServer: MongoMemoryServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        // The repository connects lazily via connectToDatabase(), which reads MONGODB_URI.
        process.env.MONGODB_URI = mongoServer.getUri();
    }, 60000);

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Ensure the connection/indexes exist, then reset between tests.
        await shareLinkRepository.findSharedRecipeIds();
        await ShareLink.syncIndexes();
        await ShareLink.deleteMany({});
        await Recipe.deleteMany({});
    });

    describe('share token', () => {
        it('is 32 URL-safe characters', () => {
            const token = generateShareToken();
            expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/);
            expect(isShareToken(token)).toBe(true);
        });

        it('is different every time', () => {
            expect(generateShareToken()).not.toBe(generateShareToken());
        });

        it('rejects anything that is not a token', () => {
            expect(isShareToken('')).toBe(false);
            expect(isShareToken('507f1f77bcf86cd799439011')).toBe(false);
            expect(isShareToken('a'.repeat(31) + '/')).toBe(false);
        });
    });

    describe('share', () => {
        it('creates a Share Link for a recipe', async () => {
            const recipeId = await createRecipe();

            const {shareLink, created} = await shareLinkRepository.share(recipeId);

            expect(created).toBe(true);
            expect(isShareToken(shareLink.token)).toBe(true);
            expect(shareLink.recipeId.toString()).toBe(recipeId);
        });

        it('keeps at most one Share Link per recipe', async () => {
            const recipeId = await createRecipe();

            const first = await shareLinkRepository.share(recipeId);
            const second = await shareLinkRepository.share(recipeId);

            expect(second.created).toBe(false);
            expect(second.shareLink.token).toBe(first.shareLink.token);
            expect(await ShareLink.countDocuments({recipeId})).toBe(1);
        });

        it('hands out a new token after a revocation', async () => {
            const recipeId = await createRecipe();
            const {shareLink: old} = await shareLinkRepository.share(recipeId);

            await shareLinkRepository.revoke(recipeId);
            const {shareLink: renewed} = await shareLinkRepository.share(recipeId);

            expect(renewed.token).not.toBe(old.token);
            expect(await shareLinkRepository.findRecipeByToken(old.token)).toBeNull();
        });
    });

    describe('findRecipeByToken', () => {
        it('finds the shared recipe', async () => {
            const recipeId = await createRecipe();
            const {shareLink} = await shareLinkRepository.share(recipeId);

            const recipe = await shareLinkRepository.findRecipeByToken(shareLink.token);

            expect(recipe?._id.toString()).toBe(recipeId);
        });

        it('finds nothing for an unknown token', async () => {
            expect(await shareLinkRepository.findRecipeByToken(generateShareToken())).toBeNull();
        });

        it('finds nothing for a recipe id used as token', async () => {
            const recipeId = await createRecipe();
            await shareLinkRepository.share(recipeId);

            expect(await shareLinkRepository.findRecipeByToken(recipeId)).toBeNull();
        });

        it('finds nothing once the Share Link is revoked', async () => {
            const recipeId = await createRecipe();
            const {shareLink} = await shareLinkRepository.share(recipeId);

            expect(await shareLinkRepository.revoke(recipeId)).toBe(true);

            expect(await shareLinkRepository.findRecipeByToken(shareLink.token)).toBeNull();
        });

        it('finds nothing once the recipe is deleted', async () => {
            const recipeId = await createRecipe();
            const {shareLink} = await shareLinkRepository.share(recipeId);

            await Recipe.findByIdAndDelete(recipeId);

            expect(await shareLinkRepository.findRecipeByToken(shareLink.token)).toBeNull();
        });
    });

    describe('revoke', () => {
        it('is a no-op for a recipe that is not shared', async () => {
            const recipeId = await createRecipe();
            expect(await shareLinkRepository.revoke(recipeId)).toBe(false);
        });

        it('only revokes the Share Link of that recipe', async () => {
            const a = await createRecipe('A');
            const b = await createRecipe('B');
            await shareLinkRepository.share(a);
            const {shareLink: linkB} = await shareLinkRepository.share(b);

            await shareLinkRepository.revoke(a);

            expect(await shareLinkRepository.findRecipeByToken(linkB.token)).not.toBeNull();
        });
    });

    describe('findSharedRecipeIds', () => {
        it('lists exactly the recipes with a Share Link', async () => {
            const shared = await createRecipe('Geteilt');
            await createRecipe('Privat');
            await shareLinkRepository.share(shared);

            const ids = await shareLinkRepository.findSharedRecipeIds();

            expect([...ids]).toEqual([shared]);
        });
    });
});
