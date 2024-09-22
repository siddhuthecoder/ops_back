    import mongoose, { Document, Schema } from 'mongoose';

    export interface ITeam extends Document {
        team_name: string;
        child_teams?: mongoose.Types.ObjectId[];
        parent_team?: mongoose.Types.ObjectId;
        locations?: mongoose.Types.ObjectId[];
        projects?: mongoose.Types.ObjectId[];
        tasks?: mongoose.Types.ObjectId[];
        announcements?: mongoose.Types.ObjectId[];
        managers?: mongoose.Types.ObjectId[];
        users?: mongoose.Types.ObjectId[];
        created_by: mongoose.Types.ObjectId;
        created_at: Date;
        updated_at: Date;
    }

    const TeamSchema: Schema<ITeam> = new Schema({
        team_name: { type: String, unique: true, required: true },
        child_teams: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
        parent_team: { type: Schema.Types.ObjectId, ref: 'Team' },
        locations: [{ type: Schema.Types.ObjectId, ref: 'Location' }],
        projects: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
        tasks: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
        announcements: [{ type: Schema.Types.ObjectId, ref: 'Announcement' }],
        managers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        users: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        created_by: { type: Schema.Types.ObjectId, ref: 'User' },
        created_at: { type: Date, default: Date.now },
        updated_at: { type: Date, default: Date.now }
    });



    export default mongoose.model<ITeam>('Team', TeamSchema);
