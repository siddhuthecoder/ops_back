import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
    category_name: string;
}

const CategorySchema: Schema<ICategory> = new Schema({
    category_name: { type: String, required: true }
});

export default mongoose.model<ICategory>('Category', CategorySchema);
