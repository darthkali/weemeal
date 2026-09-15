import mongoose, {Document, Model, Schema} from 'mongoose';

export interface IIngredient {
    contentId: string;
    contentType: 'INGREDIENT';
    position: number;
    ingredientName: string;
    unit?: string;
    amount?: number;
}

export interface ISectionCaption {
    contentId: string;
    contentType: 'SECTION_CAPTION';
    position: number;
    sectionName: string;
}

export type IIngredientListContent = IIngredient | ISectionCaption;

export interface IRecipeSource {
    type: 'book' | 'url';
    bookTitle?: string;
    bookPage?: string;
    url?: string;
}

export interface IRecipe {
    name: string;
    recipeYield: number;
    recipeInstructions: string;
    ingredientListContent: IIngredientListContent[];
    imageUrl?: string;
    tags?: string[];
    notes?: string;
    source?: IRecipeSource;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRecipeDocument extends IRecipe, Document {
}

const IngredientListContentSchema = new Schema(
    {
        contentId: {type: String, required: true},
        contentType: {
            type: String,
            required: true,
            enum: ['INGREDIENT', 'SECTION_CAPTION']
        },
        position: {type: Number, required: true},
        // Ingredient fields
        ingredientName: {type: String},
        unit: {type: String},
        amount: {type: Number},
        // Section caption fields
        sectionName: {type: String},
    },
    {_id: false}
);

const RecipeSchema = new Schema<IRecipeDocument>(
    {
        name: {
            type: String,
            required: [true, 'Recipe name is required'],
            trim: true,
            minlength: [1, 'Recipe name cannot be empty'],
            maxlength: [200, 'Recipe name cannot exceed 200 characters'],
        },
        recipeYield: {
            type: Number,
            required: [true, 'Recipe yield is required'],
            min: [1, 'Recipe yield must be at least 1'],
            max: [100, 'Recipe yield cannot exceed 100'],
        },
        recipeInstructions: {
            type: String,
            default: '',
        },
        ingredientListContent: {
            type: [IngredientListContentSchema],
            default: [],
        },
        imageUrl: {
            type: String,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        notes: {
            type: String,
            default: '',
        },
        source: {
            type: {
                type: String,
                enum: ['book', 'url'],
            },
            bookTitle: String,
            bookPage: String,
            url: String,
        },
        userId: {
            type: String,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for common queries
RecipeSchema.index({name: 'text', tags: 'text'});
RecipeSchema.index({createdAt: -1});

// Prevent model overwrite in development
const Recipe: Model<IRecipeDocument> =
    mongoose.models.Recipe || mongoose.model<IRecipeDocument>('Recipe', RecipeSchema);

export default Recipe;
