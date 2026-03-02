import fs from 'fs/promises';
import path from 'path';
import {v4 as uuidv4} from 'uuid';

// Image storage directory from environment variable or default
const IMAGES_DIR = process.env.IMAGES_DIR || './data/images';

// MIME type mapping
const MIME_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

const EXTENSION_FROM_MIME: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
};

/**
 * Ensures the images directory exists
 */
export async function ensureImagesDir(): Promise<void> {
    await fs.mkdir(IMAGES_DIR, {recursive: true});
}

/**
 * Gets the full path for an image file
 */
export function getImagePath(filename: string): string {
    return path.join(IMAGES_DIR, filename);
}

/**
 * Gets the MIME type from a file extension
 */
export function getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Gets the file extension from a MIME type
 */
export function getExtensionFromMime(mimeType: string): string {
    return EXTENSION_FROM_MIME[mimeType] || '.bin';
}

/**
 * Extracts MIME type and data from a Base64 data URL
 */
export function parseDataUrl(dataUrl: string): { mimeType: string; data: Buffer } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
        return null;
    }
    return {
        mimeType: match[1],
        data: Buffer.from(match[2], 'base64'),
    };
}

/**
 * Saves an image from a Base64 data URL
 * Returns the generated ID (filename without extension)
 */
export async function saveImageFromDataUrl(dataUrl: string): Promise<{ id: string; filename: string }> {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) {
        throw new Error('Invalid data URL format');
    }

    await ensureImagesDir();

    const id = uuidv4();
    const extension = getExtensionFromMime(parsed.mimeType);
    const filename = `${id}${extension}`;
    const filePath = getImagePath(filename);

    await fs.writeFile(filePath, parsed.data);

    return {id, filename};
}

/**
 * Saves an image from a Buffer
 * Returns the generated ID (filename without extension)
 */
export async function saveImageFromBuffer(
    buffer: Buffer,
    mimeType: string
): Promise<{ id: string; filename: string }> {
    await ensureImagesDir();

    const id = uuidv4();
    const extension = getExtensionFromMime(mimeType);
    const filename = `${id}${extension}`;
    const filePath = getImagePath(filename);

    await fs.writeFile(filePath, buffer);

    return {id, filename};
}

/**
 * Reads an image by ID (searches for file with any valid extension)
 */
export async function readImage(id: string): Promise<{ data: Buffer; mimeType: string; filename: string } | null> {
    await ensureImagesDir();

    // Search for file with any valid extension
    for (const ext of Object.keys(MIME_TYPES)) {
        const filename = `${id}${ext}`;
        const filePath = getImagePath(filename);
        try {
            const data = await fs.readFile(filePath);
            return {
                data,
                mimeType: MIME_TYPES[ext],
                filename,
            };
        } catch {
            // File doesn't exist with this extension, try next
        }
    }

    return null;
}

/**
 * Deletes an image by ID (searches for file with any valid extension)
 * Returns true if deleted, false if not found
 */
export async function deleteImage(id: string): Promise<boolean> {
    // Search for file with any valid extension
    for (const ext of Object.keys(MIME_TYPES)) {
        const filename = `${id}${ext}`;
        const filePath = getImagePath(filename);
        try {
            await fs.unlink(filePath);
            return true;
        } catch {
            // File doesn't exist with this extension, try next
        }
    }

    return false;
}

/**
 * Extracts the image ID from an image URL path
 * e.g., "/api/images/abc-123" -> "abc-123"
 */
export function extractImageIdFromUrl(url: string): string | null {
    if (!url) return null;

    // Match /api/images/{id} pattern
    const match = url.match(/\/api\/images\/([^/?#]+)/);
    if (match) {
        return match[1];
    }

    return null;
}

/**
 * Checks if a URL is a local image URL (stored in our filesystem)
 */
export function isLocalImageUrl(url: string): boolean {
    return url?.startsWith('/api/images/') ?? false;
}
