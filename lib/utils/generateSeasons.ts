import Anthropic from '@anthropic-ai/sdk';
import {IngredientListContent} from '@/types/recipe';

export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'] as const;
export type Season = typeof SEASONS[number];

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic | null {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return null;
    }
    if (!anthropicClient) {
        anthropicClient = new Anthropic({
            apiKey,
            baseURL: 'https://api.anthropic.com',
        });
    }
    return anthropicClient;
}

// Static mapping of seasonal ingredients to their available seasons
// An ingredient being listed here means it's ONLY available in those seasons
// Based on German regional availability (Deutschland)
const SEASONAL_INGREDIENTS: Record<string, Season[]> = {
    // === FRÜHLING (März-Mai) ===
    'spargel': ['Frühling'],
    'bärlauch': ['Frühling'],
    'rhabarber': ['Frühling', 'Sommer'],
    'radieschen': ['Frühling', 'Sommer', 'Herbst'],
    'spinat': ['Frühling', 'Herbst'],
    'kohlrabi': ['Frühling', 'Sommer', 'Herbst'],
    'frühlingszwiebel': ['Frühling', 'Sommer'],
    'frühlingszwiebeln': ['Frühling', 'Sommer'],
    'mangold': ['Frühling', 'Sommer', 'Herbst'],
    'kopfsalat': ['Frühling', 'Sommer', 'Herbst'],
    'kresse': ['Frühling', 'Sommer'],

    // === SOMMER (Juni-August) ===
    'tomate': ['Sommer', 'Herbst'],
    'tomaten': ['Sommer', 'Herbst'],
    'erdbeere': ['Frühling', 'Sommer'],
    'erdbeeren': ['Frühling', 'Sommer'],
    'himbeere': ['Sommer'],
    'himbeeren': ['Sommer'],
    'heidelbeere': ['Sommer'],
    'heidelbeeren': ['Sommer'],
    'blaubeere': ['Sommer'],
    'blaubeeren': ['Sommer'],
    'johannisbeere': ['Sommer'],
    'johannisbeeren': ['Sommer'],
    'stachelbeere': ['Sommer'],
    'stachelbeeren': ['Sommer'],
    'brombeere': ['Sommer', 'Herbst'],
    'brombeeren': ['Sommer', 'Herbst'],
    'zucchini': ['Sommer', 'Herbst'],
    'gurke': ['Sommer'],
    'gurken': ['Sommer'],
    'salatgurke': ['Sommer'],
    'aubergine': ['Sommer', 'Herbst'],
    'paprika': ['Sommer', 'Herbst'],
    'pfirsich': ['Sommer'],
    'pfirsiche': ['Sommer'],
    'nektarine': ['Sommer'],
    'nektarinen': ['Sommer'],
    'aprikose': ['Sommer'],
    'aprikosen': ['Sommer'],
    'kirsche': ['Sommer'],
    'kirschen': ['Sommer'],
    'süßkirsche': ['Sommer'],
    'sauerkirsche': ['Sommer'],
    'mais': ['Sommer', 'Herbst'],
    'zuckermais': ['Sommer', 'Herbst'],
    'bohne': ['Sommer', 'Herbst'],
    'bohnen': ['Sommer', 'Herbst'],
    'grüne bohnen': ['Sommer', 'Herbst'],
    'buschbohne': ['Sommer', 'Herbst'],
    'stangenbohne': ['Sommer', 'Herbst'],
    'erbse': ['Sommer'],
    'erbsen': ['Sommer'],
    'zuckererbse': ['Sommer'],
    'brokkoli': ['Sommer', 'Herbst'],
    'blumenkohl': ['Sommer', 'Herbst'],
    'fenchel': ['Sommer', 'Herbst'],
    'artischocke': ['Sommer'],
    'artischocken': ['Sommer'],
    'melone': ['Sommer'],
    'wassermelone': ['Sommer'],
    'honigmelone': ['Sommer'],
    'mirabelle': ['Sommer'],
    'mirabellen': ['Sommer'],

    // === HERBST (September-November) ===
    'kürbis': ['Herbst', 'Winter'],
    'hokkaido': ['Herbst', 'Winter'],
    'butternut': ['Herbst', 'Winter'],
    'muskatkürbis': ['Herbst', 'Winter'],
    'pilz': ['Herbst'],
    'pilze': ['Herbst'],
    'pfifferling': ['Sommer', 'Herbst'],
    'pfifferlinge': ['Sommer', 'Herbst'],
    'steinpilz': ['Sommer', 'Herbst'],
    'steinpilze': ['Sommer', 'Herbst'],
    'champignon': ['Herbst', 'Winter'],
    'champignons': ['Herbst', 'Winter'],
    // Äpfel: Ernte Herbst, Lagerware bis Mai verfügbar
    'apfel': ['Frühling', 'Herbst', 'Winter'],
    'äpfel': ['Frühling', 'Herbst', 'Winter'],
    'birne': ['Herbst'],
    'birnen': ['Herbst'],
    'pflaume': ['Sommer', 'Herbst'],
    'pflaumen': ['Sommer', 'Herbst'],
    'zwetschge': ['Sommer', 'Herbst'],
    'zwetschgen': ['Sommer', 'Herbst'],
    'traube': ['Herbst'],
    'trauben': ['Herbst'],
    'weintraube': ['Herbst'],
    'weintrauben': ['Herbst'],
    'walnuss': ['Herbst'],
    'walnüsse': ['Herbst'],
    'haselnuss': ['Herbst'],
    'haselnüsse': ['Herbst'],
    'maronen': ['Herbst', 'Winter'],
    'kastanie': ['Herbst', 'Winter'],
    'kastanien': ['Herbst', 'Winter'],
    'esskastanie': ['Herbst', 'Winter'],
    'feldsalat': ['Herbst', 'Winter'],
    'grünkohl': ['Herbst', 'Winter'],
    'rosenkohl': ['Herbst', 'Winter'],
    'quitte': ['Herbst'],
    'quitten': ['Herbst'],
    // Rote Bete: Ernte Herbst, Lagerware bis März verfügbar
    'rote bete': ['Frühling', 'Herbst', 'Winter'],
    'rote beete': ['Frühling', 'Herbst', 'Winter'],
    'schwarzwurzel': ['Herbst', 'Winter'],
    'schwarzwurzeln': ['Herbst', 'Winter'],

    // === WINTER (Dezember-Februar) + Lagerware ===
    // Kohlsorten: Lagerware bis März verfügbar
    'rotkohl': ['Frühling', 'Herbst', 'Winter'],
    'blaukraut': ['Frühling', 'Herbst', 'Winter'],
    'wirsing': ['Frühling', 'Herbst', 'Winter'],
    'weißkohl': ['Frühling', 'Herbst', 'Winter'],
    'sauerkraut': ['Frühling', 'Sommer', 'Herbst', 'Winter'], // Fermentiert, ganzjährig
    'chicorée': ['Winter', 'Frühling'],
    // Wurzelgemüse: Lagerware bis März verfügbar
    'pastinake': ['Frühling', 'Herbst', 'Winter'],
    'pastinaken': ['Frühling', 'Herbst', 'Winter'],
    'steckrübe': ['Frühling', 'Herbst', 'Winter'],
    'steckrüben': ['Frühling', 'Herbst', 'Winter'],
    'topinambur': ['Frühling', 'Herbst', 'Winter'],
    'lauch': ['Frühling', 'Herbst', 'Winter'],
    'porree': ['Frühling', 'Herbst', 'Winter'],
    'sellerie': ['Frühling', 'Herbst', 'Winter'],
    'knollensellerie': ['Frühling', 'Herbst', 'Winter'],
    'stangensellerie': ['Sommer', 'Herbst'],
};

interface RecipeData {
    name: string;
    ingredientListContent: IngredientListContent[];
}

/**
 * Get the current season based on date
 */
export function getCurrentSeason(): Season {
    const month = new Date().getMonth() + 1; // 1-12

    if (month >= 3 && month <= 5) return 'Frühling';
    if (month >= 6 && month <= 8) return 'Sommer';
    if (month >= 9 && month <= 11) return 'Herbst';
    return 'Winter';
}

/**
 * Generate seasons for a recipe using AI or fallback to static mapping
 */
export async function generateRecipeSeasons(recipe: RecipeData): Promise<Season[]> {
    const client = getClient();

    if (!client) {
        console.log('[Season Generation] Mode: FALLBACK (no ANTHROPIC_API_KEY configured)');
        return generateFallbackSeasons(recipe);
    }

    console.log(`[Season Generation] Mode: AI - Generating seasons for: "${recipe.name}"`);

    try {
        const ingredientNames = recipe.ingredientListContent
            .filter((item): item is IngredientListContent & {contentType: 'INGREDIENT'} =>
                item.contentType === 'INGREDIENT'
            )
            .map(item => item.ingredientName)
            .slice(0, 15)
            .join(', ');

        const response = await client.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 100,
            messages: [
                {
                    role: 'user',
                    content: `Analysiere dieses Rezept und bestimme, in welchen Jahreszeiten es saisonal zubereitet werden kann.

REGELN:
- Jede saisonale Zutat schränkt die verfügbaren Saisons ein (Schnittmenge bilden)
- Spargel, Bärlauch = nur Frühling
- Himbeeren, Heidelbeeren, Gurken = nur Sommer
- Tomaten, Zucchini = Sommer + Herbst
- Kürbis, Pilze = Herbst (+ Winter als Lagerware)
- Chicorée = Winter + Frühling
- Ganzjährig verfügbare Zutaten (Nudeln, Reis, Mehl, Milch, Eier, etc.) schränken NICHT ein

WICHTIG: Falls saisonale Zutaten aus verschiedenen Saisons kombiniert werden und es KEINE gemeinsame Saison gibt, antworte: KEINE

Rezept: "${recipe.name}"
Zutaten: ${ingredientNames}

Antworte NUR mit:
- Komma-separierte Saisons (Frühling, Sommer, Herbst, Winter) wenn gemeinsame Saison existiert
- "KEINE" wenn Zutaten sich gegenseitig ausschließen (z.B. Spargel + Himbeeren)
- Alle vier Saisons wenn alle Zutaten ganzjährig sind`,
                },
            ],
        });

        const content = response.content[0];
        if (content.type === 'text') {
            const seasonsText = content.text.trim().toUpperCase();

            // Check for "KEINE" response (mixed/conflicting seasons)
            if (seasonsText.includes('KEINE') || seasonsText.includes('GEMISCHT') || seasonsText.includes('NONE')) {
                console.log(`[Season Generation] AI MIXED SEASONS for "${recipe.name}": No common season`);
                return []; // Empty = mixed seasons
            }

            const seasons = content.text.trim()
                .split(',')
                .map(s => s.trim())
                .filter((s): s is Season => SEASONS.includes(s as Season));

            if (seasons.length > 0) {
                console.log(`[Season Generation] AI SUCCESS for "${recipe.name}": ${seasons.join(', ')}`);
                return seasons;
            }
        }

        console.log(`[Season Generation] AI returned invalid response, falling back to static mapping`);
        return generateFallbackSeasons(recipe);
    } catch (error) {
        console.error('[Season Generation] AI ERROR, falling back to static mapping:', error instanceof Error ? error.message : error);
        return generateFallbackSeasons(recipe);
    }
}

/**
 * Fallback season generation using static ingredient mapping
 */
function generateFallbackSeasons(recipe: RecipeData): Season[] {
    // Start with all seasons
    let availableSeasons = new Set<Season>(SEASONS);

    // Extract ingredient names
    const ingredientNames = recipe.ingredientListContent
        .filter((item): item is IngredientListContent & {contentType: 'INGREDIENT'} =>
            item.contentType === 'INGREDIENT'
        )
        .map(item => item.ingredientName.toLowerCase());

    // For each ingredient, if it's seasonal, intersect with its seasons
    for (const ingredientName of ingredientNames) {
        // Check if any part of the ingredient name matches a seasonal ingredient
        for (const [seasonalIngredient, seasons] of Object.entries(SEASONAL_INGREDIENTS)) {
            if (ingredientName.includes(seasonalIngredient)) {
                // Intersect current available seasons with this ingredient's seasons
                const ingredientSeasons = new Set<Season>(seasons);
                availableSeasons = new Set([...availableSeasons].filter(s => ingredientSeasons.has(s)));

                // If no seasons left, the recipe has conflicting seasonal ingredients
                // Return empty array to indicate "mixed seasons"
                if (availableSeasons.size === 0) {
                    console.log(`[Season Generation] MIXED SEASONS for "${recipe.name}": No common season found`);
                    return []; // Empty = mixed/conflicting seasons
                }
                break; // Found a match for this ingredient
            }
        }
    }

    const result = [...availableSeasons];
    console.log(`[Season Generation] FALLBACK SUCCESS for "${recipe.name}": ${result.join(', ')}`);
    return result;
}
