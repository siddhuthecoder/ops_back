import mongoose, { Document, Schema } from 'mongoose';

// Interface for FormConfigure settings
export interface IFormConfigure extends Document {
  form_id: mongoose.Types.ObjectId; // Reference to the Form schema
  hideUnansweredQuestions: boolean; // Hide unanswered questions when exporting individual submissions
  allowSubmitFromAnyLocation: boolean; // Allow user to submit this form at any location
  allowCopyFromPreviousForms: boolean; // Allow users to copy from previously submitted forms
  allowUploadPhotos: boolean; // Do not allow users to upload photos from their photo gallery
  showPreviousAnswersOnNo: boolean; // Show previous answers when Yes/No fields are answered "No"
  requireBluetoothProbes: boolean; // Require temperature fields to use Bluetooth probes
  allowReorderFields: boolean; // Allow users to reorder fields for their location
  doNotAllowAdminsToEditTemplate: boolean; // Do not allow admins in the company to edit this template
}

// FormConfigure Schema
const FormConfigureSchema: Schema<IFormConfigure> = new Schema({
  form_id: { type: Schema.Types.ObjectId, ref: 'Form', required: true }, // Reference to Form schema
  hideUnansweredQuestions: { type: Boolean, default: false },
  allowSubmitFromAnyLocation: { type: Boolean, default: false },
  allowCopyFromPreviousForms: { type: Boolean, default: false },
  allowUploadPhotos: { type: Boolean, default: true },
  showPreviousAnswersOnNo: { type: Boolean, default: false },
  requireBluetoothProbes: { type: Boolean, default: false },
  allowReorderFields: { type: Boolean, default: false },
  doNotAllowAdminsToEditTemplate: { type: Boolean, default: false }, // New field added here
});

// Export FormConfigure model
export default mongoose.model<IFormConfigure>('FormConfigure', FormConfigureSchema);
