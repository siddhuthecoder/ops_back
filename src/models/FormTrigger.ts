import mongoose, { Document, Schema } from 'mongoose';

// Interface for Conditions
export interface ICondition {
  type: 'metadata' | 'field'; // Condition type: metadata or field-related
  field: mongoose.Types.ObjectId | string; // Field ID for field-related conditions or other predefined options
  operator: string; // e.g., "equals", "contains", etc.
  value: any; // Value to compare against
}

// Interface for Alert Conditions
export interface IAlertCondition {
  users?: mongoose.Types.ObjectId[]; // Array of user IDs to alert
  roles?: mongoose.Types.ObjectId[]; // Array of role IDs to alert
  emails?: string[]; // Array of email addresses for notifications
}

// Interface for Trigger Task
export interface ITriggerTask {
  description: string; // Description of the trigger task
  image_urls?: string[]; // Optional image URLs for the task
  due_after: number; // Number of days after which the task is due
  assign_to: {
    type: "User" | "Hierarchy"; // Indicates the type of assignment
    id: mongoose.Types.ObjectId; // The ID that refers to either User or Hierarchy
  };
  allow_duplicate_task: boolean; // True or false
  form_id: mongoose.Types.ObjectId; // Reference to the Form schema
}

// Interface for Trigger
export interface IFormTrigger extends Document {
  team: mongoose.Types.ObjectId; // Reference to the Team schema
  form_id: mongoose.Types.ObjectId; // Reference to the Form schema
  match_type: 'match_all' | 'match_any'; // Match type: either match all or match any
  conditions: ICondition[]; // Array of conditions (metadata or field-related)
  task: ITriggerTask; // Task information related to the trigger
  alert_conditions?: IAlertCondition; // Alert conditions
}

// Define the Trigger schema
const formTriggerSchema = new Schema<IFormTrigger>({
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team', // Reference to Team schema
    required: true, // Team reference is required
  },
  form_id: {
    type: Schema.Types.ObjectId,
    ref: 'Form', // Reference to Form schema
    required: true, // Form reference is required
  },
  match_type: {
    type: String,
    enum: ['match_all', 'match_any'], // Enum for match types
    required: true, // Match type is required
  },
  conditions: [{
    type: {
      type: String,
      enum: ['metadata', 'field'], // Condition type
      required: true,
    },
    field: {
      type: Schema.Types.Mixed, // Can be ObjectId or a predefined string
      required: true, // Field is required
      validate: {
        validator: function(this: ICondition, fieldValue: any) {
          if (this.type === 'field') {
            // If the condition type is 'field', the field must be an ObjectId
            return mongoose.Types.ObjectId.isValid(fieldValue);
          } else {
            // For other types, allow predefined strings
            const allowedFields = [
              'any field',
              'submitted by',
              'time to complete',
              'distance from location',
              'location',
              'date submitted',
              'project'
            ];
            return allowedFields.includes(fieldValue);
          }
        },
        message: 'Invalid field value based on condition type.',
      },
    },
    operator: {
      type: String,
      required: true, // Operator is required
    },
    value: {
      type: Schema.Types.Mixed, // Value can be of any type
      required: true, // Value is required
    },
  }],
  task: {
    description: {
      type: String,
    },
    image_urls: [
      {
        type: String,
        trim: true,
      },
    ],
    due_after: {
      type: Number,
    },
    assign_to: {
      type: {
        type: String, // "User" or "Hierarchy"
        enum: ["User", "Hierarchy"], // Only allow these values
      },
      id: {
        type: Schema.Types.ObjectId,
      },
    },
    allow_duplicate_task: {
      type: Boolean,
      default: false, // Default value for allow_duplicate_task
    },
    form_id: {
      type: Schema.Types.ObjectId,
      ref: 'Form', // Reference to Form schema
    },
  },
  alert_conditions: {
    users: [{
      type: Schema.Types.ObjectId,
      ref: 'User', // Reference to User schema
    }],
    roles: [{
      type: Schema.Types.ObjectId,
      ref: 'Hierarchy', // Reference to Hierarchy schema for roles
    }],
    emails: [{ type: String }], // Array of email addresses for alerts
  },
}, {
  timestamps: true, // Automatically add createdAt and updatedAt timestamps
});

// Export the model with the new name
export default mongoose.model<IFormTrigger>('FormTrigger', formTriggerSchema);
