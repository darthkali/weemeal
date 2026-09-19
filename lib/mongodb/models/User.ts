import mongoose, {Document, Model, Schema} from 'mongoose';

export type UserRole = 'user' | 'admin';

export interface IUser {
    username: string;
    passwordHash: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
}

const UserSchema = new Schema<IUserDocument>(
    {
        username: {
            type: String,
            required: [true, 'Username is required'],
            trim: true,
            minlength: [1, 'Username cannot be empty'],
            maxlength: [100, 'Username cannot exceed 100 characters'],
            unique: true,
        },
        passwordHash: {
            type: String,
            required: [true, 'Password hash is required'],
        },
        role: {
            type: String,
            required: true,
            enum: ['user', 'admin'],
            default: 'user',
        },
    },
    {
        timestamps: true,
    }
);

// Prevent model overwrite in development
const User: Model<IUserDocument> =
    mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);

export default User;
