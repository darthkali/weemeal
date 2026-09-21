import {NextRequest, NextResponse} from 'next/server';
import {revalidatePath} from 'next/cache';
import {recipeRepository} from '@/lib/mongodb/repositories/RecipeRepository';
import {shareLinkRepository} from '@/lib/mongodb/repositories/ShareLinkRepository';
import {sessionGuard, sharingGuard} from '@/lib/auth/session';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// Ohne Session antwortet zuerst der Session-Check (401); in einer Open
// Instance gibt es Share Links gar nicht (404).
async function guard(): Promise<NextResponse | null> {
    return (await sessionGuard()) ?? sharingGuard();
}

function recipeNotFound() {
    return NextResponse.json({error: 'Recipe not found'}, {status: 404});
}

// GET /api/recipes/[id]/share - Share Token des Recipe, oder null
export async function GET(request: NextRequest, {params}: RouteParams) {
    const denied = await guard();
    if (denied) return denied;

    try {
        const {id} = await params;
        if (!(await recipeRepository.findById(id))) {
            return recipeNotFound();
        }

        const shareLink = await shareLinkRepository.findByRecipeId(id);
        return NextResponse.json({token: shareLink?.token ?? null});
    } catch (error) {
        console.error('Error fetching share link:', error);
        return NextResponse.json({error: 'Failed to fetch share link'}, {status: 500});
    }
}

// POST /api/recipes/[id]/share - Recipe teilen (liefert den bestehenden
// Share Link, falls es schon einen gibt)
export async function POST(request: NextRequest, {params}: RouteParams) {
    const denied = await guard();
    if (denied) return denied;

    try {
        const {id} = await params;
        if (!(await recipeRepository.findById(id))) {
            return recipeNotFound();
        }

        const {shareLink, created} = await shareLinkRepository.share(id);
        revalidatePath('/');

        return NextResponse.json({token: shareLink.token}, {status: created ? 201 : 200});
    } catch (error) {
        console.error('Error creating share link:', error);
        return NextResponse.json({error: 'Failed to create share link'}, {status: 500});
    }
}

// DELETE /api/recipes/[id]/share - Share Link widerrufen
export async function DELETE(request: NextRequest, {params}: RouteParams) {
    const denied = await guard();
    if (denied) return denied;

    try {
        const {id} = await params;
        await shareLinkRepository.revoke(id);
        revalidatePath('/');

        return NextResponse.json({success: true});
    } catch (error) {
        console.error('Error revoking share link:', error);
        return NextResponse.json({error: 'Failed to revoke share link'}, {status: 500});
    }
}
