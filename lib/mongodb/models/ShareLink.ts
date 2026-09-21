import mongoose, {Document, Model, Schema, Types} from 'mongoose';

// Share Link: widerrufbarer Lesezugriff auf genau ein Recipe ohne Session.
// Eigenes Aggregat neben dem Recipe — das Recipe weiß nichts davon (ADR 0005).
export interface IShareLink {
    token: string;
    recipeId: Types.ObjectId;
    createdAt: Date;
}

export interface IShareLinkDocument extends IShareLink, Document {
}

const ShareLinkSchema = new Schema<IShareLinkDocument>(
    {
        token: {
            type: String,
            required: true,
            unique: true,
        },
        // Höchstens ein Share Link pro Recipe. Mehrere pro Recipe bräuchten
        // nur diesen Index ohne `unique` — keine Migration der Daten.
        recipeId: {
            type: Schema.Types.ObjectId,
            ref: 'Recipe',
            required: true,
            unique: true,
        },
    },
    {
        timestamps: {createdAt: true, updatedAt: false},
    }
);

// Prevent model overwrite in development
const ShareLink: Model<IShareLinkDocument> =
    mongoose.models.ShareLink || mongoose.model<IShareLinkDocument>('ShareLink', ShareLinkSchema);

export default ShareLink;
