import {randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
import {connectToDatabase} from '../connection';
import ShareLink, {IShareLinkDocument} from '../models/ShareLink';
import Recipe, {IRecipeDocument} from '../models/Recipe';

// 24 zufällige Bytes, base64url: 32 Zeichen, unratbar und URL-tauglich.
const TOKEN_BYTES = 24;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function generateShareToken(): string {
    return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isShareToken(value: string): boolean {
    return TOKEN_PATTERN.test(value);
}

function isDuplicateKeyError(error: unknown): boolean {
    return (error as {code?: unknown} | null)?.code === 11000;
}

export class ShareLinkRepository {
    private async ensureConnection(): Promise<void> {
        await connectToDatabase();
    }

    async findByRecipeId(recipeId: string): Promise<IShareLinkDocument | null> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(recipeId)) {
            return null;
        }

        return ShareLink.findOne({recipeId}).exec();
    }

    /**
     * Gibt den Share Link des Recipe zurück und legt ihn an, falls es noch
     * keinen gibt — höchstens einer pro Recipe. `created` sagt, ob er neu ist.
     */
    async share(recipeId: string): Promise<{shareLink: IShareLinkDocument; created: boolean}> {
        const existing = await this.findByRecipeId(recipeId);
        if (existing) {
            return {shareLink: existing, created: false};
        }

        try {
            const shareLink = await new ShareLink({recipeId, token: generateShareToken()}).save();
            return {shareLink, created: true};
        } catch (error) {
            // Zwei gleichzeitige Klicks: der unique-Index auf recipeId lässt
            // nur einen durch, der andere bekommt denselben Link.
            if (isDuplicateKeyError(error)) {
                const winner = await this.findByRecipeId(recipeId);
                if (winner) {
                    return {shareLink: winner, created: false};
                }
            }
            throw error;
        }
    }

    /** Widerruft den Share Link des Recipe. Ohne Share Link ein No-op. */
    async revoke(recipeId: string): Promise<boolean> {
        await this.ensureConnection();

        if (!mongoose.Types.ObjectId.isValid(recipeId)) {
            return false;
        }

        const result = await ShareLink.deleteOne({recipeId}).exec();
        return result.deletedCount > 0;
    }

    /** Die Recipe IDs, die gerade einen Share Link haben. */
    async findSharedRecipeIds(): Promise<Set<string>> {
        await this.ensureConnection();

        const links = await ShareLink.find({}, {recipeId: 1}).lean().exec();
        return new Set(links.map((link) => link.recipeId.toString()));
    }

    /**
     * Das Recipe hinter einem Share Token — oder null, wenn der Token
     * unbekannt, widerrufen oder das Recipe gelöscht ist. Die drei Fälle
     * sind für den Share Recipient bewusst nicht unterscheidbar.
     */
    async findRecipeByToken(token: string): Promise<IRecipeDocument | null> {
        if (!isShareToken(token)) {
            return null;
        }

        await this.ensureConnection();

        const shareLink = await ShareLink.findOne({token}).exec();
        if (!shareLink) {
            return null;
        }

        return Recipe.findById(shareLink.recipeId).exec();
    }
}

// Singleton instance
export const shareLinkRepository = new ShareLinkRepository();
