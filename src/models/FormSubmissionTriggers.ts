import mongoose, { Document, Schema } from 'mongoose';


export interface IFormSubmissionTriggers extends Document {
  form_id: mongoose.Types.ObjectId; // Refers to Form schema
  form_submitter: boolean; // Whether to notify the submitter
  location_email: boolean; // Whether to notify based on location email
  dropbox: boolean; // Whether to send to Dropbox
  send_to: Array<{
    type: 'User' | 'Role' | 'Email'; // Defines whether it's a user, role, or email
    user?: mongoose.Types.ObjectId; // Refers to User schema if type is 'User'
    role?: mongoose.Types.ObjectId; // Refers to Hierarchy schema if type is 'Role'
    email?: string; // Email string if type is 'Email'
  }>; // Array of recipients (users, roles, or emails)
}

const FormSubmissionTriggersSchema: Schema<IFormSubmissionTriggers> = new Schema({
  form_id: { type: Schema.Types.ObjectId, ref: 'Form', required: true }, // Reference to Form schema
  form_submitter: { type: Boolean, default: false }, // Notify form submitter
  location_email: { type: Boolean, default: false }, // Notify based on location email
  dropbox: { type: Boolean, default: false }, // Send to Dropbox
  send_to: [
    {
      type: { type: String, enum: ['User', 'Role', 'Email'], required: true }, // User, Role, or Email
      user: { type: Schema.Types.ObjectId, ref: 'User' }, // Reference to User schema
      role: { type: Schema.Types.ObjectId, ref: 'Hierarchy' }, // Reference to Hierarchy schema
      email: { type: String }, // Email string
    },
  ],
});

export default mongoose.model<IFormSubmissionTriggers>('FormSubmissionTriggers', FormSubmissionTriggersSchema);
