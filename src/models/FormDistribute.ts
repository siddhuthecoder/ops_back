import mongoose, { Document, Schema } from 'mongoose';

// Define an interface for form permissions
export interface IFormPermission extends Document {
  _id: mongoose.Types.ObjectId; // Explicitly define _id
  permission_type: 'ViewAll' | 'ViewOwn' | 'EditAll' | 'EditOwn'; // Define permission types
  user?: mongoose.Types.ObjectId; // Optional user reference
  role?: mongoose.Types.ObjectId; // Optional role reference
  team?: mongoose.Types.ObjectId; // Optional team reference
}

// Define an interface for the FormDistribute schema
export interface IFormDistribute extends Document {
  form_id: mongoose.Types.ObjectId; // Reference to the Form schema
  permissions: IFormPermission[]; // Array of permissions
}

// Define the form permission schema
const FormPermissionSchema: Schema<IFormPermission> = new Schema({
  permission_type: { 
    type: String, 
    enum: ['ViewAll', 'ViewOwn', 'EditAll', 'EditOwn'], 
    required: true 
  },
  user: { type: Schema.Types.ObjectId, ref: 'User' }, 
  role: { type: Schema.Types.ObjectId, ref: 'Role' }, 
  team: { type: Schema.Types.ObjectId, ref: 'Team' } 
});

// Define the FormDistribute schema
const FormDistributeSchema: Schema<IFormDistribute> = new Schema({
  form_id: { type: Schema.Types.ObjectId, ref: 'Form', required: true }, // Reference to the Form schema
  permissions: { type: [FormPermissionSchema], default: [] } // Array of permissions
});

// Export the FormDistribute model
export default mongoose.model<IFormDistribute>('FormDistribute', FormDistributeSchema);
