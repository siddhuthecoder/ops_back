import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Field } from '../../models/Field';
import Form from '../../models/Form';
import { FormFields } from '../../models/FormFields';
import { IUser } from '../../models/User';

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
const createNewFields = async (fields: Array<IField>, files: Express.Multer.File[]): Promise<mongoose.Types.ObjectId[]> => {
    const createdFields: mongoose.Types.ObjectId[] = [];

    for (let i = 0; i < fields.length; i++) {
        const fieldData = fields[i];
        const file = (files && files[i]) ? files[i].filename : null;

        const newField: any = new Field({
            type: fieldData.type,
            title: fieldData.title,
            instructions: fieldData.instructions || '',
            value: fieldData.value || '',
            file: file,
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

// Controller function to handle form editing by deleting all fields and creating new ones
export const editFormWithFields = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { formId, fields } = req.body;
        const files = req.files as Express.Multer.File[];

        // Find the form and its associated fields
        const formFields = await FormFields.findOne({ formId }).populate('fields');
        const form: any = await Form.findById(formId);

        if (!formFields) {
            return res.status(404).json({ message: 'Form not found' });
        }

        if (!form.creator_user_id.equals(req.user!._id)) {
            return res.status(403).json({ message: 'You are not authorized to edit this form.' });
        }

        // Delete all existing fields for this form
        await Field.deleteMany({ _id: { $in: formFields.fields } });

        // Create new fields
        const newFieldIds = await createNewFields(fields, files);

        // Map newFieldIds to ObjectId
        formFields.fields = newFieldIds.map(id => {
            return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
        });

        // Save the updated form fields
        await formFields.save();

        res.status(200).json({ message: 'Form fields updated successfully' });
    } catch (err) {
        res.status(500).json({ error: (err as Error).message });
    }
};

// Controller function to handle form creation
export const createFormWithFields = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Destructure title and category_id from request body
        const { title, category_id } = req.body;
        const fields = JSON.parse(req.body.fields);
        const files = req.files as Express.Multer.File[];

        // Create a new form
        const creator_user_id = req.user!._id; // Assuming the user ID is coming from middleware

        const newForm = new Form({
            title,
            category_id,
            creator_user_id,
        });

        // Save the new form and get the generated form ID
        const savedForm = await newForm.save();

        // Create new fields using the provided fields and files
        const newFieldIds = await createNewFields(fields, files);

      
        const formFields = new FormFields({
            formId: savedForm._id, // Use the ID of the newly created form
            fields: newFieldIds,
        });

        await formFields.save();

        // Respond with success message
        res.status(201).json({ message: 'Form and fields created successfully', formId: savedForm._id });
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
        console.error(err);
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
        console.error(err);
        res.status(500).json({ error: (err as Error).message });
    }
};
