import { Request, Response } from 'express';
import Form from '../../models/Form'; // Import the Form model
import FormConfigure from '../../models/FormConfigure'; // Import the FormConfigure model
import { FormFields } from '../../models/FormFields'; // Import the FormFields model
import FormSubmissionTriggers from '../../models/FormSubmissionTriggers'; // Import the FormSubmissionTriggers model

// Function to fetch form fields
const fetchFormFields = async (formId: string) => {
  return await FormFields.findOne({ formId });
};

// Function to fetch form configuration
const fetchFormConfigure = async (formId: string) => {
  return await FormConfigure.findOne({ form_id: formId });
};

// Function to fetch form distribute details
const fetchFormDistribute = async (formId: string) => {
  return await Form.findById(formId);
};

const fetchFormSubmissionTrigger = async (formId: string) => {
  return await FormSubmissionTriggers.findOne({ form_id: formId }); // Use the correct field name
};

export const getFormDetails = async (req: Request, res: Response) => {
  const { formId } = req.params; // Get formId from URL parameters

  try {
    // Call all four API functions in parallel
    const [
      formFields,
      formConfig,
      formDistribute,
      submissionTrigger
    ] = await Promise.all([
      fetchFormFields(formId),
      fetchFormConfigure(formId),
      fetchFormDistribute(formId),
      fetchFormSubmissionTrigger(formId)
    ]);

    // Check if each response is null or undefined and return specific error messages
    // if (!formFields) {
    //   return res.status(404).json({ message: 'Form fields not found' });
    // }

    // if (!formConfig) {
    //   return res.status(404).json({ message: 'Form configuration not found' });
    // }

    // if (!formDistribute) {
    //   return res.status(404).json({ message: 'Form distribution details not found' });
    // }

    // if (!submissionTrigger) {
    //   return res.status(404).json({ message: 'Form submission trigger not found' });
    // }

    // Prepare the response object
    const response = {
      fields: formFields?.fields, // Fields associated with the form
      configure: formConfig, // Form configuration
      distribute: formDistribute || null, // Distribute settings (if any)
      submissionTrigger: submissionTrigger || null // Submission trigger settings (if any)
    };

    // Send the response with status 200
    return res.status(200).json(response);
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error retrieving form details:', error);
    // Send a generic error message
    return res.status(500).json({ message: 'Error retrieving form', error });
  }
};
