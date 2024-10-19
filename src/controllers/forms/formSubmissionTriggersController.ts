import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FormSubmissionTriggers from '../../models/FormSubmissionTriggers'; // Import the model

// Create a new FormSubmissionTrigger
export const createFormSubmissionTrigger = async (req: Request, res: Response) => {
  try {
    const newTrigger = new FormSubmissionTriggers({
      form_id: req.body.form_id,
      form_submitter: req.body.form_submitter,
      location_email: req.body.location_email,
      dropbox: req.body.dropbox,
      send_to: req.body.send_to
    });

    const savedTrigger = await newTrigger.save();
    res.status(201).json(savedTrigger);
  } catch (error) {
    res.status(500).json({ message: 'Error creating form submission trigger', error });
  }
};

// Edit a FormSubmissionTrigger based on form_id
export const editFormSubmissionTrigger = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;
    const updatedTrigger = await FormSubmissionTriggers.findOneAndUpdate(
      { form_id: new mongoose.Types.ObjectId(form_id) },
      req.body, // Updates the fields passed in the request body
      { new: true } // Return the updated document
    );

    if (!updatedTrigger) {
      return res.status(404).json({ message: 'FormSubmissionTrigger not found' });
    }

    res.status(200).json(updatedTrigger);
  } catch (error) {
    res.status(500).json({ message: 'Error updating form submission trigger', error });
  }
};

// Delete a FormSubmissionTrigger based on form_id
export const deleteFormSubmissionTrigger = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;
    const deletedTrigger = await FormSubmissionTriggers.findOneAndDelete({
      form_id: new mongoose.Types.ObjectId(form_id)
    });

    if (!deletedTrigger) {
      return res.status(404).json({ message: 'FormSubmissionTrigger not found' });
    }

    res.status(200).json({ message: 'FormSubmissionTrigger deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting form submission trigger', error });
  }
};

// Get a FormSubmissionTrigger based on form_id
export const getFormSubmissionTrigger = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;
    const trigger = await FormSubmissionTriggers.findOne({
      form_id: new mongoose.Types.ObjectId(form_id)
    });

    if (!trigger) {
      return res.status(404).json({ message: 'FormSubmissionTrigger not found' });
    }

    res.status(200).json(trigger);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving form submission trigger', error });
  }
};
