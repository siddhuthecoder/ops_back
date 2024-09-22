import mongoose, { Document, Schema } from 'mongoose';

export interface ITask extends Document {
  title: string;
  description: string;
  image_urls: string[];
  current_status: 'Active' | 'Missed' | 'Completed' | 'Deleted' | 'inProgress';
  created_by: mongoose.Types.ObjectId;
  submitted_by?: mongoose.Types.ObjectId; // New field for tracking who submitted the task
  date_created: Date;
  due_date: Date;
  date_start: Date;
  date_submitted?: Date;
  is_active: boolean;
  is_closed: boolean;
  is_expired: boolean;
  assign_to: mongoose.Types.ObjectId[]; // Updated to array of users
  comments: {
    user: mongoose.Types.ObjectId;
    comment: string;
    date_created: Date;
  }[];
  followers: mongoose.Types.ObjectId[];
  location?: mongoose.Types.ObjectId;
  team?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId; // New field for referencing the Project model
}

const TaskSchema: Schema<ITask> = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image_urls: [
      {
        type: String,
        trim: true,
      },
    ],
    current_status: {
      type: String,
      enum: ['Active', 'Missed', 'Completed', 'Deleted', 'inProgress'],
      default: 'Active',
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    submitted_by: {
      type: Schema.Types.ObjectId,
      ref: 'User', // New reference to the User model
      required: false, // Optional field
    },
    date_created: {
      type: Date,
      default: Date.now,
    },
    due_date: {
      type: Date,
      required: true,
    },
    date_start: {
      type: Date,
      required: true,
    },
    date_submitted: {
      type: Date,
    },
    assign_to: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        comment: {
          type: String,
          required: true,
          trim: true,
        },
        date_created: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    location: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: 'Team',
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project', // New reference to the Project model
      required: false, // Optional field
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>('Task', TaskSchema);
