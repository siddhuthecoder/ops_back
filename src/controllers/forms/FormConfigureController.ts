import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FormConfigure from '../../models/FormConfigure'; 
import Form from '../../models/Form'; 

export const createFormConfigure = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.body;

    const form = await Form.findById(form_id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    const existingFormConfigure = await FormConfigure.findOne({ form_id });

    if (existingFormConfigure) {
      await FormConfigure.deleteOne({ form_id });
    }

    const formConfigure = new FormConfigure(req.body);
    const savedFormConfigure = await formConfigure.save();

    return res.status(201).json(savedFormConfigure);
  } catch (error) {
    console.error('Error creating form configuration:', error);
    return res.status(500).json({ message: 'Error creating form configuration', error });
  }
};


// Get all FormConfigures
export const getAllFormConfigures = async (req: Request, res: Response) => {
  try {
    const formConfigures = await FormConfigure.find();
    console.log(formConfigures);
    return res.status(200).json(formConfigures);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching form configurations', error });
  }
};

// Get a single FormConfigure by ID
export const getFormConfigureById = async (req: Request, res: Response) => {
  try {
    const formConfigure = await FormConfigure.findById(req.params.id);
    if (!formConfigure) {
      return res.status(404).json({ message: 'Form configuration not found' });
    }
    return res.status(200).json(formConfigure);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching form configuration', error });
  }
};

// Get FormConfigure by form_id
export const getFormConfigureByFormId = async (req: Request, res: Response) => {
  try {
    const formConfigure = await FormConfigure.findOne({ form_id: req.params.formId });
    if (!formConfigure) {
      return res.status(404).json({ message: 'Form configuration not found for this form_id' });
    }
    return res.status(200).json(formConfigure);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching form configuration by form_id', error });
  }
};

// Update FormConfigure by form_id with form existence check
export const updateFormConfigure = async (req: Request, res: Response) => {
    try {
      const { formId } = req.params;
  
      // Check if the form with the given form_id exists
      const form = await Form.findById(formId);
      if (!form) {
        return res.status(404).json({ message: 'Form not found with the provided form_id' });
      }
  
      // Update the FormConfigure associated with the form_id
      const updatedFormConfigure = await FormConfigure.findOneAndUpdate(
        { form_id: formId }, // Find by form_id
        req.body, 
        { new: true } // Return the updated document
      );
  
      if (!updatedFormConfigure) {
        return res.status(404).json({ message: 'Form configuration not found for the given form_id' });
      }
  
      return res.status(200).json(updatedFormConfigure);
    } catch (error) {
      return res.status(500).json({ message: 'Error updating form configuration', error });
    }
  };
  

// Delete FormConfigure by form_id
export const deleteFormConfigure = async (req: Request, res: Response) => {
  try {
    const deletedFormConfigure = await FormConfigure.findOneAndDelete({ form_id: req.params.formId });
    if (!deletedFormConfigure) {
      return res.status(404).json({ message: 'Form configuration not found for this form_id' });
    }
    return res.status(200).json({ message: 'Form configuration deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Error deleting form configuration', error });
  }
};
