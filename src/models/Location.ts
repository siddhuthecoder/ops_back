import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
    location_name: string;
    team: mongoose.Types.ObjectId[];
    projects: mongoose.Types.ObjectId[];
    tasks: mongoose.Types.ObjectId[];
    address?: string;
    city?: string;
    state?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    email?: string;
    phone?: string; 
    external_key?: string; 
    users: mongoose.Types.ObjectId[];
    owners: mongoose.Types.ObjectId[];
    created_by: mongoose.Types.ObjectId;
    created_at: Date;
    updated_at: Date;
}

const LocationSchema: Schema<ILocation> = new Schema({
    location_name: { type: String, required: true },
    team: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    address: { type: String },
    city: { type: String },
    state: { type: String },
    region: { type: String },
    postal_code: { type: String },
    country: { type: String },
    email: { type: String },
    phone: { type: String }, // Added phone field
    external_key: { type: String }, // Added external_key field
    users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    owners: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    created_by: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

export default mongoose.model<ILocation>('Location', LocationSchema);
