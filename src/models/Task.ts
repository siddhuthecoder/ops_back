import mongoose, { Document, Schema } from "mongoose";

export interface ITask extends Document {
  title: string;
  description: string;
  image_urls: string[];
  current_status: "Active" | "Missed" | "Completed" | "Deleted" | "inProgress" | "Archived"; 
  created_by: mongoose.Types.ObjectId;
  submitted_by?: mongoose.Types.ObjectId; 
  submission_id?: mongoose.Types.ObjectId; // Field for linking a task to a submission
  form_id?: mongoose.Types.ObjectId; // New field for linking a task to a form
  date_created: Date;
  due_date: Date;
  date_start: Date;
  date_submitted?: Date;
  is_active: boolean;
  is_closed: boolean;
  is_expired: boolean;
  assign_to: mongoose.Types.ObjectId; 
  comments: {
    user: mongoose.Types.ObjectId;
    comment: string;
    date_created: Date;
  }[];
  followers: mongoose.Types.ObjectId[];
  location?: mongoose.Types.ObjectId;
  team?: mongoose.Types.ObjectId;
  project?: mongoose.Types.ObjectId; 
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
      enum: ["Active", "Missed", "Completed", "Deleted", "inProgress", "Archived"],
      default: "Active",
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submitted_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    submission_id: { // Field for submission reference
      type: Schema.Types.ObjectId,
      ref: "Submission",
      required: false,
    },
    form_id: { // New field for form reference
      type: Schema.Types.ObjectId,
      ref: "Form", // Referencing the 'Form' schema
      required: false,
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
    assign_to: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    location: {
      type: Schema.Types.ObjectId,
      ref: "Location",
    },
    team: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: false,
    },    
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITask>("Task", TaskSchema);
