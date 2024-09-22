import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
    firstname?: string;
    lastname?: string;
    email: string;
    phone?: string;
    password?: string;
    date_joined?: Date;
    status: 'Active' | 'Inactive' | 'InvitationSent';
    permissions: 'Submitter' | 'Admin' | 'Manager';
    role?: mongoose.Types.ObjectId;
    team?: mongoose.Types.ObjectId[];
    location?: mongoose.Types.ObjectId[];
    assigned_tasks?: mongoose.Types.ObjectId[];
    assigned_projects?: mongoose.Types.ObjectId[];
    announcements?: mongoose.Types.ObjectId[];
    can_change_permissions: boolean;
}

const UserSchema: Schema<IUser> = new Schema({
    firstname: { type: String },
    lastname: { type: String },
    email: { type: String, unique: true, required: true },
    phone: { type: String },
    password: { type: String },
    date_joined: { type: Date, default: null },
    status: { type: String, enum: ["Active", "Inactive", "InvitationSent"], default: "InvitationSent" },
    permissions: { type: String, enum: ["Submitter", "Admin", "Manager"], required: true },
    role: { type: Schema.Types.ObjectId, ref: 'Role' },
    team: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
    location: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
    assigned_tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    assigned_projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    announcements: [{ type: Schema.Types.ObjectId, ref: 'Announcement' }],
    can_change_permissions: { type: Boolean, default: false }
});

export default mongoose.model<IUser>('User', UserSchema);


