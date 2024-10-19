import mongoose, { Document, Schema } from "mongoose";

// Define the TriggerTask interface
export interface ITriggerTask extends Document {
  title: string;
  description: string;
  image_urls: string[];
  currentStatus: "Active" | "Missed" | "Completed" | "Deleted" | "inProgress" | "Archived"; 
  createdBy: mongoose.Types.ObjectId; // Refers to User
  submittedBy?: mongoose.Types.ObjectId; // Refers to User
  trigger_id: mongoose.Types.ObjectId; // Reference for the trigger
  form_id?: mongoose.Types.ObjectId; // Reference for the form
  date_created: Date;
  due_date: Date;
  date_submitted?: Date;
  assign_to: {
    type: "User" | "Hierarchy"; // Indicates the type of assignment
    id: mongoose.Types.ObjectId; // The ID that refers to either User or Hierarchy
  };
  allow_duplicate_task: boolean; // True or false
}

// Define the TriggerTask schema
const TriggerTaskSchema: Schema<ITriggerTask> = new Schema(
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
    currentStatus: {
      type: String,
      enum: ["Active", "Missed", "Completed", "Deleted", "inProgress", "Archived"],
      default: "Active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    trigger_id: {
      type: Schema.Types.ObjectId,
      required: true, // Reference for the trigger
    },
    form_id: {
      type: Schema.Types.ObjectId,
      ref: "Form", // Reference for the form
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
    date_submitted: {
      type: Date,
    },
    assign_to: {
      type: {
        type: String, // "User" or "Hierarchy"
        enum: ["User", "Hierarchy"], // Only allow these values
        required: true,
      },
      id: {
        type: Schema.Types.ObjectId,
        required: true, // The ID of the assigned entity
      },
    },
    allow_duplicate_task: {
      type: Boolean,
      default: false, // Default value for allow_duplicate_task
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITriggerTask>("TriggerTask", TriggerTaskSchema);
