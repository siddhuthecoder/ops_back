import { Request, Response } from 'express';
import PDFDocument from 'pdfkit'; // Import PDFKit
import Form from '../../models/Form'; // Assuming the Form schema is in the 'models' directory
import { IUser } from "../../models/User";
import sendEmail from "../../utils/emailService"; // Adjust the import path as necessary

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Create a new form
export const createForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category_id } = req.body;
    const creator_user_id = req.user!._id; // Assuming the user ID is coming from middleware

    const newForm = new Form({
      title,
      category_id,
      creator_user_id,
    });

    await newForm.save();

    return res.status(201).json({ message: 'Form created successfully', form: newForm });
  } catch (error) {
    return res.status(500).json({ message: 'Error creating form', error });
  }
};

// Get all forms
export const getAllForms = async (req: Request, res: Response) => {
  try {
    const forms = await Form.find({ deleted: false }).populate('category_id').populate('creator_user_id', 'firstname lastname email');
    return res.status(200).json(forms);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching forms', error });
  }
};

// Get form by ID
export const getFormById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id).populate('category_id').populate('creator_user_id', 'name email');

    if (!form || form.deleted) {
      return res.status(404).json({ message: 'Form not found' });
    }

    return res.status(200).json(form);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching form', error });
  }
};

// Soft delete form (mark as deleted)
export const deleteForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id);

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    form.deleted = true;
    await form.save();

    return res.status(200).json({ message: 'Form deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting form', error });
  }
};

// Generate PDF from form data
const generatePDF = async (form: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];

    // Collect PDF data in buffer
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    // PDF content
    doc.fontSize(25).text('Form Export', { align: 'center' });
    doc.moveDown();
    doc.fontSize(18).text(`Title: ${form.title}`, { underline: true });
    doc.text(`Category: ${form.category_id}`, { indent: 20 });
    doc.text(`Created By: ${form.creator_user_id.name}`, { indent: 20 });
    doc.text(`Email: ${form.creator_user_id.email}`, { indent: 20 });
    // Add more form fields as needed
    doc.end();
  });
};

// Export form and send email
export const exportForm = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const form = await Form.findById(id).populate('category_id').populate('creator_user_id', 'name email');

    if (!form || form.deleted) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Generate PDF
    const pdfBuffer = await generatePDF(form);

    // Prepare email details
    const to = req.user!.email; // Assuming the user's email is available in the request
    const subject = `Exported Form: ${form.title}`;
    const text = `Here is the exported form titled "${form.title}".`;
    const attachments = [{ filename: `${form.title}.pdf`, content: pdfBuffer }];

    // Send email
    await sendEmail(to, subject, text, attachments);

    return res.status(200).json({ message: 'Form exported and email sent successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error exporting form or sending email', error });
  }
};
