import mongoose, { Document, Schema } from 'mongoose';

export interface IHierarchy extends Document {
    role: string;
    reports_to?: mongoose.Types.ObjectId;
    level: number;
    permissions: 'Submitter' | 'Manager' | 'Admin';
}

const HierarchySchema: Schema<IHierarchy> = new Schema({
    role: { type: String, required: true },
    reports_to: { type: Schema.Types.ObjectId, ref: 'Hierarchy' },
    level: { type: Number, required: true },
    permissions: { type: String, enum: ["Submitter", "Manager", "Admin"], required: true }
});

export default mongoose.model<IHierarchy>('Hierarchy', HierarchySchema);
