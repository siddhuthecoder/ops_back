import mongoose, { Document, Schema } from 'mongoose';

export interface IFormFields extends Document {
  formId: mongoose.Types.ObjectId; // Refers to the Form schema
  fields: mongoose.Types.ObjectId[]; // Array of Field schema ObjectIds
}

// Define the schema for FormFields
const formFieldsSchema = new Schema<IFormFields>({
  formId: { type: Schema.Types.ObjectId, ref: 'Form', required: true },
  fields: [{ type: Schema.Types.ObjectId, ref: 'Field', required: true }], 
});

// Export the FormFields model
export const FormFields = mongoose.model<IFormFields>('FormFields', formFieldsSchema);
