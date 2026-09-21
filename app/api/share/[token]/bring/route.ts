import {NextRequest, NextResponse} from 'next/server';
import {shareLinkRepository} from '@/lib/mongodb/repositories/ShareLinkRepository';
import {sharingGuard} from '@/lib/auth/session';
import {bringHtmlResponse} from '@/lib/utils/bringHtmlResponse';

interface RouteParams {
    params: Promise<{ token: string }>;
}

// GET /api/share/[token]/bring - Bring-HTML für den Share Recipient.
// Läuft über den Share Token statt die Recipe ID, damit ein Widerruf auch
// diesen Weg schließt.
export async function GET(request: NextRequest, {params}: RouteParams) {
    const notFound = sharingGuard();
    if (notFound) return notFound;

    try {
        const {token} = await params;
        const recipeDoc = await shareLinkRepository.findRecipeByToken(token);

        if (!recipeDoc) {
            return NextResponse.json({error: 'Not found'}, {status: 404});
        }

        // Kein Caching: nach einem Widerruf soll der Link sofort tot sein.
        return bringHtmlResponse(recipeDoc, 'no-store');
    } catch (error) {
        console.error('Error generating shared Bring HTML:', error);
        return NextResponse.json(
            {error: 'Failed to generate recipe HTML'},
            {status: 500}
        );
    }
}
