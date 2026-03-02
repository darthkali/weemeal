import {NextRequest, NextResponse} from 'next/server';
import {saveImageFromBuffer, saveImageFromDataUrl} from '@/lib/images/storage';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * POST /api/images
 * Accepts either:
 * - JSON body with { dataUrl: "data:image/...;base64,..." }
 * - FormData with file field "image"
 *
 * Returns: { id: "uuid", url: "/api/images/uuid" }
 */
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            // Handle JSON with data URL
            const body = await request.json();
            const {dataUrl} = body;

            if (!dataUrl || typeof dataUrl !== 'string') {
                return NextResponse.json(
                    {error: 'Missing or invalid dataUrl field'},
                    {status: 400}
                );
            }

            if (!dataUrl.startsWith('data:image/')) {
                return NextResponse.json(
                    {error: 'Invalid data URL format. Must be an image.'},
                    {status: 400}
                );
            }

            // Check approximate size (base64 is ~4/3 the size of binary)
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
                const estimatedSize = (base64Data.length * 3) / 4;
                if (estimatedSize > MAX_FILE_SIZE) {
                    return NextResponse.json(
                        {error: `Image too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`},
                        {status: 400}
                    );
                }
            }

            const {id} = await saveImageFromDataUrl(dataUrl);

            return NextResponse.json({
                id,
                url: `/api/images/${id}`,
            });
        } else if (contentType.includes('multipart/form-data')) {
            // Handle FormData upload
            const formData = await request.formData();
            const file = formData.get('image') as File | null;

            if (!file) {
                return NextResponse.json(
                    {error: 'No image file provided'},
                    {status: 400}
                );
            }

            if (!file.type.startsWith('image/')) {
                return NextResponse.json(
                    {error: 'File must be an image'},
                    {status: 400}
                );
            }

            if (file.size > MAX_FILE_SIZE) {
                return NextResponse.json(
                    {error: `Image too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`},
                    {status: 400}
                );
            }

            const buffer = Buffer.from(await file.arrayBuffer());
            const {id} = await saveImageFromBuffer(buffer, file.type);

            return NextResponse.json({
                id,
                url: `/api/images/${id}`,
            });
        } else {
            return NextResponse.json(
                {error: 'Invalid content type. Use application/json or multipart/form-data'},
                {status: 400}
            );
        }
    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
            {error: 'Failed to upload image'},
            {status: 500}
        );
    }
}
