import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for Field
export interface IField extends Document {
  type: string; // Field type (e.g., 'text', 'select', 'checkbox', 'stopwatch')
  title: string; // The title of the field that will be displayed
  instructions?: string; // Optional instructions to guide the user on how to fill the field
  value?: mongoose.Schema.Types.Mixed; // The current value of the field (can vary depending on type)
  file?: mongoose.Schema.Types.Mixed; // For fields that handle file uploads
  default_value?: mongoose.Schema.Types.Mixed; // Default value when the field is first rendered
  hidden?: boolean; // Boolean to indicate if the field is hidden from view
  visible?: boolean; // Boolean to indicate if the field is visible (default is true)
  required?: boolean; // Boolean to indicate if this field must be filled by the user
  options?: string[]; // Options for select, checkbox, or other fields with predefined choices
  metadata?: {
    allow_na?: boolean; // Whether 'N/A' (not applicable) is allowed as an option
    expand_instructions?: boolean; // Whether to expand the instructions by default
    is_collapsed?: boolean; // Whether the field section is collapsed by default
    section_parent_id?: mongoose.Types.ObjectId; // Parent section ID (if the field is part of a section)
    allow_stopwatch?: boolean; // Whether to allow the use of a stopwatch (for time-tracking fields)
    stopwatch_entry?: 'manual' | 'stopwatch'; // Manual entry or stopwatch for time fields
    dependent_parent_id?: number; // The ID of the parent field for dependent visibility or behavior
    dynamic_visibility?: {
      visibility_choice: string; // Determines if the field should 'show' or 'hide' based on conditions
      attribute_criteria_filters?: {
        boolean_operator: string; // match all or match any conditions
        filters: {
          attribute_type: string; // Type of attribute to filter on (e.g., 'GEO_COUNTRY', 'COMPANY_ID')
          operator: string; // The operator to apply for filtering (e.g., 'EQ', 'NOT_EQ')
          value: any; // The value to compare against for the filter (could be a string, number, etc.)
        }[];
      };
    };
    rating?: {
      minimum: number; // Minimum rating value
      maximum: number; // Maximum rating value
    };
    date?: {
      include_time: boolean; // Whether to include time with the date
    };
  };
  evaluation?: {
    yes: {
      outcome: 'pass' | 'fail' | 'neutral'; // Evaluation outcome for "yes" answer
    };
    no: {
      outcome: 'pass' | 'fail' | 'neutral'; // Evaluation outcome for "no" answer
    };
  };
  events?: {
    event: string; // The event name (e.g., 'change', 'submit', etc.)
    value: string | boolean; // The value that the event is linked to (could be a string or boolean)
    target?: number; // Optional target field ID that this event will affect
    acceptance_values?: number[]; // A list of values that are accepted for this event's conditions
  }[];
  acceptance_value?: number; // The value to determine if the field is accepted for certain criteria
  acceptance_criteria?: {
    condition: {
      operator_id: string; // The operator for condition comparison (e.g., '=', '==')
      condition_value: any; // The value to be used for comparison in the condition
    };
    metadata: {
      acceptance_value: number; // The acceptance value if the condition is met
    };
  }[];
}

// Define the schema for Field with proper comments for each field
const FieldSchema: Schema<IField> = new Schema({
  type: { 
    type: String, 
    required: true 
  }, // Field type is required (e.g., 'text', 'select', 'checkbox')
  
  title: { 
    type: String, 
    required: true 
  }, // Field title is required (displayed to users)
  
  instructions: { 
    type: String, 
    default: '' 
  }, // Optional instructions for users, default to an empty string
  
  value: { 
    type: mongoose.Schema.Types.Mixed, 
    default: '' 
  }, // The current value of the field, with a default of an empty string
  
  file: { 
    type: mongoose.Schema.Types.Mixed 
  }, // For file uploads, can store file data
  
  default_value: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null 
  }, // Default value for the field, set to null by default
  
  hidden: { 
    type: Boolean, 
    default: false 
  }, // Boolean to indicate if the field is hidden, default is false
  
  visible: { 
    type: Boolean, 
    default: true 
  }, // Boolean to indicate if the field is visible, default is true
  
  required: { 
    type: Boolean, 
    default: false 
  }, // Boolean to indicate if the field is required, default is false
  
  options: { 
    type: [String], 
    default: [] 
  }, // Options for select or checkbox fields, default is an empty array
  
  metadata: {
    allow_na: { 
      type: Boolean, 
      default: false 
    }, // Whether 'N/A' is allowed, default is false
    
    expand_instructions: { 
      type: Boolean, 
      default: false 
    }, // Whether to expand instructions, default is false
    
    is_collapsed: { 
      type: Boolean, 
      default: false 
    }, // Whether the field is collapsed by default, default is false
    
    section_parent_id: { 
      type: Schema.Types.ObjectId, 
      ref: 'Field' 
    }, // Reference to parent section if this field is part of a section
    
    allow_stopwatch: { 
      type: Boolean, 
      default: false 
    }, // Whether to allow a stopwatch for time-based fields, default is false
    
    stopwatch_entry: { 
      type: String, 
      enum: ['manual', 'stopwatch'], 
      default: 'manual' 
    }, // Entry method for stopwatch field, default is manual
    
    dependent_parent_id: { 
      type: Number 
    }, // The parent field ID for fields that depend on another field
    
    dynamic_visibility: {
      visibility_choice: { 
        type: String 
      }, // Whether to 'show' or 'hide' the field dynamically
      
      attribute_criteria_filters: {
        boolean_operator: { 
          type: String 
        }, // (for match all or match any)
        
        filters: [
          {
            attribute_type: { 
              type: String 
            }, // Type of attribute to filter (e.g., 'GEO_COUNTRY')
            
            operator: { 
              type: String 
            }, // Operator for the filter (e.g., 'EQ', 'NOT_EQ')
            
            value: { 
              type: mongoose.Schema.Types.Mixed 
            }, // The value to compare against in the filter
          },
        ],
      },
    },
    
    rating: {
      minimum: { 
        type: Number,
      }, // Minimum rating value, required
      
      maximum: { 
        type: Number, 
      } // Maximum rating value, required
    },
    
    date: {
      include_time: { 
        type: Boolean, 
        default: false 
      } // Whether to include time with the date, default is false
    }
  },
  
  evaluation: {
    yes: {
      outcome: { 
        type: String, 
        enum: ['pass', 'fail', 'neutral'], 
      } // Evaluation outcome for "yes" response, required
    },
    
    no: {
      outcome: { 
        type: String, 
        enum: ['pass', 'fail', 'neutral'], 
      } // Evaluation outcome for "no" response, required
    }
  },
  
  events: [
    {
      event: { 
        type: String, 
        required: true 
      }, // Event name (e.g., 'change', 'click'), required
      
      value: { 
        type: mongoose.Schema.Types.Mixed, 
        required: true 
      }, // Value associated with the event, required
      
      target: { 
        type: Number 
      }, // Optional target field ID that this event affects
      
      acceptance_values: { 
        type: [Number], 
        default: [] 
      }, // A list of acceptable values for the event, default is an empty array
    },
  ],
  
  acceptance_value: { 
    type: Number 
  }, // Value for acceptance criteria
  
  acceptance_criteria: [
    {
      condition: {
        operator_id: { 
          type: String, 
          required: true 
        }, // Operator for the condition (e.g., '=', '=='), required
        
        condition_value: { 
          type: mongoose.Schema.Types.Mixed, 
          required: true 
        }, // Value to compare against for the condition, required
      },
      
      metadata: {
        acceptance_value: { 
          type: Number, 
          required: true 
        }, // Value for acceptance if the condition is met, required
      },
    },
  ],
});

export const Field = mongoose.model<IField>('Field', FieldSchema);
