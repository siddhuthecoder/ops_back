import mongoose, { Document, Schema } from 'mongoose';

export interface IProject extends Document {
    title: string;
    instruction: string;
    followers: mongoose.Types.ObjectId[]; // Array of User references
    tasks: mongoose.Types.ObjectId[]; // Array of Task references
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
    date_due_local?: Date;
    date_due_naive?: string;
    date_due?: Date;
    date_modified: Date;
    date_start_local?: Date;
    date_start_naive?: string;
    date_start?: Date;
    parent_project?: mongoose.Types.ObjectId; // Reference to another Project (parent)
    child_projects: mongoose.Types.ObjectId[]; // Array of child Project references
    recurrence: {
        frequency: string;
        interval: number;
        byweekday: string[];
        custom_attrs: {
            dtstart_local: string;
            start_initial_project_now: boolean;
        };
        due_type: 'After' | 'Date'; // New field for due_type
        after?: number; // Number of recurrences if due_type is 'After'
        date?: Date; // End date if due_type is 'Date'
    };
    assigned_role: mongoose.Types.ObjectId; // Reference to Hierarchy schema
    assigned_users: mongoose.Types.ObjectId[]; // Array of User references
    team: mongoose.Types.ObjectId; // Reference to Team schema
    locations_at: mongoose.Types.ObjectId[]; // Array of Location references
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
    date_due_local: { type: Date },
    date_due_naive: { type: String },
    date_due: { type: Date },
    date_modified: { type: Date, default: Date.now },
    date_start_local: { type: Date },
    date_start_naive: { type: String },
    date_start: { type: Date },
    parent_project: { type: Schema.Types.ObjectId, ref: 'Project' },
    child_projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
    recurrence: {
        frequency: { type: String }, // e.g., 'daily', 'weekly', 'monthly', 'yearly'
        interval: { type: Number },  // e.g., repeat every 1, 2, 3... days/weeks/months/years
        byweekday: [{ type: String }], // e.g., ['Monday', 'Wednesday']
        custom_attrs: {
            dtstart_local: { type: String },
            start_initial_project_now: { type: Boolean, default: false }
        },
        // New recurrence fields
        due_type: { type: String, enum: ['After', 'Date'], required: true },  // 'After' or 'Date'
        after: { type: Number }, // If due_type is 'After', defines the number of occurrences
        date: { type: Date } // If due_type is 'Date', defines the end date for the recurrence
    },
    tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }], // Array of task references
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of user references
    assigned_role: { type: Schema.Types.ObjectId, ref: 'Hierarchy', required: true },
    assigned_users: [{ type: Schema.Types.ObjectId, ref: 'User' }], // Array of user references
    team: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
    locations_at: [{ type: Schema.Types.ObjectId, ref: 'Location' }] // Array of locations
});

export default mongoose.model<IProject>('Project', ProjectSchema);
