import { Request, Response } from "express";
import Trigger, { IFormTrigger } from "../../models/FormTrigger";
import mongoose from "mongoose";

// Create Trigger
export const createTrigger = async (req: Request, res: Response) => {
  try {
    // Extracting the required fields from the request body
    const {
      team,
      match_type,
      conditions,
      form_id,
      task, // Changed to match new structure and made optional
      alert_conditions, // Made optional
    } = req.body;

    if (!team || !match_type || !conditions || !form_id) {
      return res.status(400).json({ message: "All fields except task and alert_conditions are required" });
    }

    // Ensure the field refers to the right value based on condition type
    conditions.forEach((condition: any) => {
      if (condition.type === 'field') {
        condition.field = new mongoose.Types.ObjectId(condition.field);
      } else {
        // Map to other available options like 'any field', 'submitted by', etc.
        const validMetadataFields = [
          'any field', 
          'submitted by', 
          'time to complete', 
          'distance from location', 
          'location', 
          'date submitted', 
          'project'
        ];
        if (!validMetadataFields.includes(condition.field)) {
          throw new Error("Invalid metadata field");
        }
      }
    });

    const newTrigger: IFormTrigger = new Trigger({
      team,
      form_id, 
      match_type,
      conditions,
      task: task || null, // Optional task, defaults to null if not provided
      alert_conditions: alert_conditions || null, // Optional alert_conditions, defaults to null if not provided
    });

    // Save the new trigger to the database
    await newTrigger.save();

    // Respond with the created trigger
    res.status(201).json({ message: "Trigger created successfully", trigger: newTrigger });
  } catch (error) {
    res.status(500).json({ message: "Error creating trigger", error });
  }
};

// Get all triggers
export const getAllTriggers = async (req: Request, res: Response) => {
  try {
    const triggers = await Trigger.find()
      .populate("team") 
      .populate("form_id") 
      .populate("alert_conditions.users") 
      .populate("alert_conditions.roles"); 
    res.status(200).json(triggers);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving triggers", error });
  }
};

// Get a trigger by ID
export const getTriggerById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid trigger ID" });
  }

  try {
    const trigger = await Trigger.findById(id).populate("form_id");

    if (!trigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.status(200).json(trigger);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving trigger", error });
  }
};

// Get triggers by form ID
export const getTriggersByFormId = async (req: Request, res: Response) => {
  const { form_id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(form_id)) {
    return res.status(400).json({ message: "Invalid form ID" });
  }

  try {
    const triggers = await Trigger.find({ form_id }).populate("team");

    res.status(200).json(triggers);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving triggers by form ID", error });
  }
};

// Update trigger
export const updateTrigger = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid trigger ID" });
  }

  // Convert field and any other ObjectId fields
  if (req.body.conditions) {
    req.body.conditions.forEach((condition: any) => {
      if (condition.type === 'field') {
        condition.field = new mongoose.Types.ObjectId(condition.field);
      } else {
        const validMetadataFields = [
          'any field', 
          'submitted by', 
          'time to complete', 
          'distance from location', 
          'location', 
          'date submitted', 
          'project'
        ];
        if (!validMetadataFields.includes(condition.field)) {
          throw new Error("Invalid metadata field");
        }
      }
    });
  }

  if (req.body.form_id) {
    req.body.form_id = new mongoose.Types.ObjectId(req.body.form_id);
  }

  // Optionally include task and alert_conditions if provided
  const updateData = { ...req.body };
  if (!updateData.task) {
    delete updateData.task;
  }
  if (!updateData.alert_conditions) {
    delete updateData.alert_conditions;
  }

  try {
    const updatedTrigger = await Trigger.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedTrigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.status(200).json({
      message: "Trigger updated successfully",
      trigger: updatedTrigger,
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating trigger", error });
  }
};

// Delete a trigger
export const deleteTrigger = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid trigger ID" });
  }

  try {
    const deletedTrigger = await Trigger.findByIdAndDelete(id);

    if (!deletedTrigger) {
      return res.status(404).json({ message: "Trigger not found" });
    }

    res.status(200).json({ message: "Trigger deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting trigger", error });
  }
};
