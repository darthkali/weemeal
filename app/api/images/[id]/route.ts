import {NextRequest, NextResponse} from 'next/server';
import {deleteImage, readImage} from '@/lib/images/storage';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/images/[id]
 * Returns the image file with correct Content-Type
 */
export async function GET(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;

        // Validate ID format (UUID-like pattern)
        if (!id || id.length < 32 || !/^[a-f0-9-]+$/i.test(id)) {
            return NextResponse.json(
                {error: 'Invalid image ID'},
                {status: 400}
            );
        }

        const image = await readImage(id);

        if (!image) {
            return NextResponse.json(
                {error: 'Image not found'},
                {status: 404}
            );
        }

        // Return image with proper headers
        // Convert Buffer to Uint8Array for NextResponse compatibility
        return new NextResponse(new Uint8Array(image.data), {
            status: 200,
            headers: {
                'Content-Type': image.mimeType,
                'Content-Length': image.data.length.toString(),
                'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
            },
        });
    } catch (error) {
        console.error('Error fetching image:', error);
        return NextResponse.json(
            {error: 'Failed to fetch image'},
            {status: 500}
        );
    }
}

/**
 * DELETE /api/images/[id]
 * Deletes the image file
 */
export async function DELETE(request: NextRequest, {params}: RouteParams) {
    try {
        const {id} = await params;

        // Validate ID format
        if (!id || id.length < 32 || !/^[a-f0-9-]+$/i.test(id)) {
            return NextResponse.json(
                {error: 'Invalid image ID'},
                {status: 400}
            );
        }

        const deleted = await deleteImage(id);

        if (!deleted) {
            return NextResponse.json(
                {error: 'Image not found'},
                {status: 404}
            );
        }

        return NextResponse.json({success: true});
    } catch (error) {
        console.error('Error deleting image:', error);
        return NextResponse.json(
            {error: 'Failed to delete image'},
            {status: 500}
        );
    }
}
