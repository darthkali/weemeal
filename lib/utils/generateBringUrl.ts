const BRING_API_BASE = 'https://api.getbring.com/rest/bringrecipes/deeplink';

export interface GenerateBringUrlOptions {
    // Pfad des Bring-HTML-Endpunkts: per Recipe ID oder per Share Token.
    recipePath: string;
    baseUrl: string;
    baseQuantity: number;
    requestedQuantity: number;
}

export function generateBringUrl(options: GenerateBringUrlOptions): string {
    const {recipePath, baseUrl, baseQuantity, requestedQuantity} = options;

    // Build the recipe endpoint URL
    const recipeEndpoint = `${baseUrl}${recipePath}`;

    // Build the Bring deeplink URL
    const url = new URL(BRING_API_BASE);
    url.searchParams.set('url', recipeEndpoint);
    url.searchParams.set('source', 'web');
    url.searchParams.set('baseQuantity', String(baseQuantity));
    url.searchParams.set('requestedQuantity', String(requestedQuantity));

    return url.toString();
}

export function generateBringUrlFromEnv(
    recipeId: string,
    baseQuantity: number,
    requestedQuantity: number
): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return generateBringUrl({
        recipePath: `/api/recipes/bring/${recipeId}`,
        baseUrl,
        baseQuantity,
        requestedQuantity,
    });
}

export default generateBringUrl;
