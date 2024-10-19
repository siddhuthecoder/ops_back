import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    title: string;
    instruction: string;
    followers: mongoose.Types.ObjectId[]; // Array of User references
    no_of_tasks: number;
    no_of_tasks_closed: number;
    tasks_form_template: {
        id: number;
    };
    status: 'Active' | 'Archive' | 'Deleted';
    is_started: boolean;
    allow_any_user_fulfill: boolean;
    created_by: mongoose.Types.ObjectId; // Reference to User
    date_archived?: Date;
    date_created: Date;
    date_deleted?: Date;
    date_due?: Date;
    date_modified: Date;
    date_start?: Date;
    parent_project?: mongoose.Types.ObjectId; // Reference to another Project (parent)
    child_projects: mongoose.Types.ObjectId[]; // Array of child Project references
    assigned_role: mongoose.Types.ObjectId; // Reference to Hierarchy schema
    assigned_users: mongoose.Types.ObjectId[]; // Array of User references
    team: mongoose.Types.ObjectId; // Reference to Team schema
    locations_at: mongoose.Types.ObjectId[]; // Array of Location references

    // New fields
    isRecurring: boolean; // Indicates if the project is recurring
    recurrenceFrequency: string; // Frequency of recurrence
    recurrence_id?: mongoose.Types.ObjectId; // Reference to a recurring project
    form_id?: mongoose.Types.ObjectId; // Reference to a form
}

const ProjectSchema: Schema<IProject> = new Schema({
    title: { type: String, required: true },
    instruction: { type: String, required: true },
    no_of_tasks: { type: Number, required: true },
    no_of_tasks_closed: { type: Number, default: 0 },
    tasks_form_template: {
        id: { type: Number }
    },
    status: {
        type: String,
        enum: ['Active', 'Archive', 'Deleted'],
        default: 'Active',
        required: true
    },
    is_started: { type: Boolean, default: false },
    allow_any_user_fulfill: { type: Boolean, default: false },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date_archived: { type: Date },
    date_created: { type: Date, default: Date.now },
    date_deleted: { type: Date },
    date_due: { type: Date },
    date_modified: { type: Date, default: Date.now },
    date_start: { type: Date },
    parent_project: { type: Schema.Types.ObjectId, ref: 'Project' },
    child_projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of user references
    assigned_role: { type: Schema.Types.ObjectId, ref: 'Hierarchy', required: true },
    assigned_users: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of user references
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    locations_at: [{ type: Schema.Types.ObjectId, ref: 'Location' }], // Array of locations

    isRecurring: { type: Boolean, default: false }, // Indicates if the project is recurring
    recurrenceFrequency: { type: String }, // Frequency of recurrence
    recurrence_id: { type: Schema.Types.ObjectId, ref: 'Project' }, // Reference to the recurring project
    form_id: { type: Schema.Types.ObjectId, ref: 'Form' } // Reference to a form
});

export default mongoose.model<IProject>('Project', ProjectSchema);
