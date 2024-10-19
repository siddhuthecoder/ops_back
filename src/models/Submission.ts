import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for the location (latitude and longitude)
interface ILocation {
  latitude: number;
  longitude: number;
}

// Define the interface for an individual comment
interface IComment {
  user: mongoose.Types.ObjectId; // Refers to User schema
  comment: string; // The actual comment text
  date_created: Date; // Date when the comment was created
}

// Define the interface for Submission document
export interface ISubmission extends Document {
  form_id: mongoose.Types.ObjectId; // Refers to Form schema
  task_id: mongoose.Types.ObjectId; // Refers to Task schema
  location_id: mongoose.Types.ObjectId; // Refers to Location schema
  project_id: mongoose.Types.ObjectId; // Refers to Project schema
  submission_date: Date;
  submitted_by: mongoose.Types.ObjectId; // Refers to User schema
  submitted_location: ILocation; // Location containing latitude and longitude
  is_approved: boolean;
  time_taken: number; // Time taken for submission
  comments: IComment[]; // Array of comments
}

// Define the schema for location (latitude and longitude)
const LocationSchema: Schema<ILocation> = new Schema({
  latitude: { type: Number, required: true }, // Latitude of the submitted location
  longitude: { type: Number, required: true }, // Longitude of the submitted location
});

// Define the schema for the individual comment
const CommentSchema: Schema<IComment> = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Refers to User schema
  comment: { type: String, required: true }, // Comment text
  date_created: { type: Date, default: Date.now }, // Automatically set the comment creation date
});

// Define the schema for Submission
const SubmissionSchema: Schema<ISubmission> = new Schema({
  form_id: { type: Schema.Types.ObjectId, ref: 'Form', required: true }, // Form ID is required
  task_id: { type: Schema.Types.ObjectId, ref: 'Task', required: true }, // Task ID is required
  location_id: { type: Schema.Types.ObjectId, ref: 'Location', required: true }, // Location ID is required
  project_id: { type: Schema.Types.ObjectId, ref: 'Project' }, // Project ID (optional if not required)
  submission_date: { type: Date, default: Date.now }, // Defaults to the current date
  submitted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Submitted by is required
  submitted_location: { type: LocationSchema, required: true }, // Submitted location is required (latitude and longitude)
  is_approved: { type: Boolean, default: false }, // Default to false, pending approval
  time_taken: { type: Number, required: true }, // Time taken for submission is required
  comments: { type: [CommentSchema], default: [] }, // Array of comments (optional)
});

export default mongoose.model<ISubmission>('Submission', SubmissionSchema);
