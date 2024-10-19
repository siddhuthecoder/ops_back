import mongoose, { Document, Schema } from 'mongoose';

export interface IForm extends Document {
  title: string;
  category_id: mongoose.Types.ObjectId; // Refers to Category schema
  creator_user_id: mongoose.Types.ObjectId; // Refers to User schema
  date_created: Date;
  date_last_submitted?: Date;
  deleted: boolean;
  is_secure: boolean;
  num_submissions: number;
  last_submitted?: Date; // New field added
  status: 'Active' | 'Archived'; // Added status field
}

const FormSchema: Schema<IForm> = new Schema({
  title: { type: String, required: true },
  category_id: { type: Schema.Types.ObjectId, ref: 'Category', required: true }, 
  creator_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true }, 
  date_created: { type: Date, default: Date.now },
  date_last_submitted: { type: Date },
  deleted: { type: Boolean, default: false },
  is_secure: { type: Boolean, default: false },
  num_submissions: { type: Number, default: 0 },
  last_submitted: { type: Date }, // Added to the schema
  status: { type: String, enum: ['Active', 'Archived'], default: 'Active' }, // Added status field
});

export default mongoose.model<IForm>('Form', FormSchema);
