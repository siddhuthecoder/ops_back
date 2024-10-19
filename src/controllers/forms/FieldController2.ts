import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Field } from '../../models/Field';
import Form from '../../models/Form';
import { FormFields } from '../../models/FormFields';
import { IUser } from "../../models/User";

// Interface for request with authenticated user
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Interface for field data based on the updated field schema
interface IField {
    type: string;
    title: string;
    instructions?: string;
    value?: mongoose.Schema.Types.Mixed;
    file?: mongoose.Schema.Types.Mixed | null;
    default_value?: mongoose.Schema.Types.Mixed | null;
    hidden?: boolean;
    visible?: boolean;
    required?: boolean;
    options?: string[];
    metadata?: {
        allow_na?: boolean;
        expand_instructions?: boolean;
        is_collapsed?: boolean;
        section_parent_id?: mongoose.Types.ObjectId;
        allow_stopwatch?: boolean;
        stopwatch_entry?: 'manual' | 'stopwatch';
        dependent_parent_id?: number;
        dynamic_visibility?: {
            visibility_choice: string;
            attribute_criteria_filters?: {
                boolean_operator: string;
                filters: {
                    attribute_type: string;
                    operator: string;
                    value: any;
                }[];
            };
        };
        rating?: {
            minimum: number;
            maximum: number;
        };
        date?: {
            include_time: boolean;
        };
    };
    events?: {
        event: string;
        value: string | boolean;
        target?: number;
        acceptance_values?: number[];
    }[];
    acceptance_value?: number;
    acceptance_criteria?: {
        condition: {
            operator_id: string;
            condition_value: any;
        };
        metadata: {
            acceptance_value: number;
        };
    }[];
}

// Function to create new fields based on the updated schema
const createNewFields = async (fields: Array<IField>) => {
    const createdFields = [];
    for (const fieldData of fields) {
        const newField = new Field({
            type: fieldData.type,
            title: fieldData.title,
            instructions: fieldData.instructions || '',
            value: fieldData.value || '',
            file: fieldData.file || null,
            default_value: fieldData.default_value || null,
            hidden: fieldData.hidden || false,
            visible: fieldData.visible || true,
            required: fieldData.required || false,
            options: fieldData.options || [],
            metadata: fieldData.metadata || {},
            events: fieldData.events || [],
            acceptance_value: fieldData.acceptance_value || null,
            acceptance_criteria: fieldData.acceptance_criteria || [],
        });

        await newField.save();
        createdFields.push(newField._id);
    }
    return createdFields;
};

// Function to update existing fields based on the updated schema
const updateField = async (fieldId: mongoose.Types.ObjectId, fieldData: IField) => {
    return await Field.findByIdAndUpdate(fieldId, {
        type: fieldData.type,
        title: fieldData.title,
        instructions: fieldData.instructions || '',
        value: fieldData.value || '',
        file: fieldData.file || null,
        default_value: fieldData.default_value || null,
        hidden: fieldData.hidden || false,
        visible: fieldData.visible || true,
        required: fieldData.required || false,
        options: fieldData.options || [],
        metadata: fieldData.metadata || {},
        events: fieldData.events || [],
        acceptance_value: fieldData.acceptance_value || null,
        acceptance_criteria: fieldData.acceptance_criteria || [],
    });
};

// Controller function to handle form editing
export const editFormWithFields = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { formId, reorderFields, newFields, updatedFields } = req.body;

        const formFields = await FormFields.findOne({ formId }).populate('fields');
        const form: any = await Form.findById(formId);

        if (!formFields) {
            return res.status(404).json({ message: 'Form not found' });
        }

        if (!form.creator_user_id.equals(req.user!._id)) {
            return res.status(403).json({ message: 'You are not authorized to edit this form.' });
        }

        // Reordering fields logic
        if (reorderFields) {
            const { fieldId, targetIndex } = reorderFields;
            const fieldIndex = formFields.fields.findIndex((field: any) => field._id.equals(fieldId));

            if (fieldIndex !== -1) {
                const [field] = formFields.fields.splice(fieldIndex, 1); // Remove field from original position
                formFields.fields.splice(targetIndex, 0, field); // Add field to target position
            }
        }

        // Updating existing fields
        for (const updatedField of updatedFields) {
            const field = await updateField(updatedField.fieldId, updatedField.fieldData);
            if (!field) {
                return res.status(404).json({ message: `Field with ID ${updatedField.fieldId} not found` });
            }
        }

        // Adding new fields
        if (newFields && newFields.length > 0) {
            newFields.sort((a: any, b: any) => a.index - b.index); // Sort fields by index

            for (const newFieldData of newFields) {
                const newField = new Field(newFieldData);
                await newField.save();
                formFields.fields.splice(newFieldData.index, 0, newField._id as mongoose.Types.ObjectId); // Add new field ID to correct position
            }
        }

        // Save updated form fields
        await formFields.save();

        res.status(200).json({ message: 'Form updated successfully' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

// Controller function to handle form creation
export const createFormWithFields = async (req: Request, res: Response) => {
    try {
        const { formId, fields } = req.body;
        const newFieldIds = await createNewFields(fields);

        const existingForm = await FormFields.findOne({ formId });
        if (existingForm) {
            return res.status(400).json({ message: 'Fields already exist for the given form. Try editing them instead.' });
        }

        const formFields = new FormFields({
            formId,
            fields: newFieldIds,
        });

        await formFields.save();

        res.status(201).json({ message: 'Form and fields created successfully', formId });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

// Function to get fields of a specific form
export const getFields = async (req: Request, res: Response) => {
    try {
        const { formId } = req.params;

        const formFields = await FormFields.findOne({ formId })
            .populate('fields')
            .exec();

        if (!formFields) {
            return res.status(404).json({ message: 'Form not found' });
        }

        res.status(200).json({ fields: formFields.fields });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

// Controller function to handle field deletion
export const deleteField = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { fieldId, formId } = req.params;

        const fieldToDelete = await Field.findById(fieldId);
        if (!fieldToDelete) {
            return res.status(404).json({ message: 'Field not found' });
        }

        const formFields = await FormFields.findOne({ formId }).populate('fields');
        if (!formFields) {
            return res.status(404).json({ message: 'Form not found' });
        }

        const form: any = await Form.findById(formId);
        if (!form.creator_user_id.equals(req.user!._id)) {
            return res.status(403).json({ message: 'You are not authorized to delete this field.' });
        }

        await Field.findByIdAndDelete(fieldId);

        formFields.fields = formFields.fields.filter((field: any) => !field._id.equals(fieldId));

        await formFields.save();

        res.status(200).json({ message: 'Field deleted successfully' });
    } catch (err) {
        console.error(err); // Log the error for debugging
        res.status(500).json({ error: (err as Error).message });
    }
};
