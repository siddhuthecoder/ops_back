import { Request, Response } from 'express';
import mongoose from 'mongoose';
import FormDistribute from '../../models/FormDistribute'; // Import your model

// Controller to create a new FormDistribute
export const createFormDistribute = async (req: Request, res: Response) => {
  try {
    const { form_id, permissions } = req.body;
    const existingFormDistribute = await FormDistribute.findOne({ form_id: new mongoose.Types.ObjectId(form_id) });
    // If it exists, delete the previous FormDistribute document
    if (existingFormDistribute) {
      await FormDistribute.deleteOne({ form_id: new mongoose.Types.ObjectId(form_id) });
    }
    // Create a new FormDistribute document
    const newFormDistribute = new FormDistribute({
      form_id: new mongoose.Types.ObjectId(form_id),
      permissions: permissions.map((permission: any) => ({
        permission_type: permission.permission_type,
        user: permission.user ? new mongoose.Types.ObjectId(permission.user) : null,
        role: permission.role ? new mongoose.Types.ObjectId(permission.role) : null,
        team: permission.team ? new mongoose.Types.ObjectId(permission.team) : null,
      })),
    });

    const savedFormDistribute = await newFormDistribute.save();
    return res.status(201).json(savedFormDistribute);
  } catch (error) {
    return res.status(500).json({ error: 'Error creating FormDistribute' });
  }
};

// Controller to update a FormDistribute by form_id
export const updateFormDistributeByFormId = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;
    const { permissions } = req.body;

    // Find the FormDistribute by form_id and update it
    const updatedFormDistribute = await FormDistribute.findOneAndUpdate(
      { form_id: new mongoose.Types.ObjectId(form_id) },
      {
        permissions: permissions.map((permission: any) => ({
          permission_type: permission.permission_type,
          user: permission.user ? new mongoose.Types.ObjectId(permission.user) : null,
          role: permission.role ? new mongoose.Types.ObjectId(permission.role) : null,
          team: permission.team ? new mongoose.Types.ObjectId(permission.team) : null,
        })),
      },
      { new: true } // Return the updated document
    );

    if (!updatedFormDistribute) {
      return res.status(404).json({ error: 'FormDistribute not found' });
    }

    return res.status(200).json(updatedFormDistribute);
  } catch (error) {
    return res.status(500).json({ error: 'Error updating FormDistribute' });
  }
};

// Controller to delete a FormDistribute by form_id
export const deleteFormDistributeByFormId = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;

    const deletedFormDistribute = await FormDistribute.findOneAndDelete({ form_id: new mongoose.Types.ObjectId(form_id) });

    if (!deletedFormDistribute) {
      return res.status(404).json({ error: 'FormDistribute not found' });
    }

    return res.status(200).json({ message: 'FormDistribute deleted successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Error deleting FormDistribute' });
  }
};

// Controller to get a FormDistribute by form_id
export const getFormDistributeByFormId = async (req: Request, res: Response) => {
  try {
    const { form_id } = req.params;

    // Fetch the FormDistribute document and populate the necessary fields
    const formDistribute = await FormDistribute.findOne({ 
      form_id: new mongoose.Types.ObjectId(form_id) 
    }).populate([
      { path: 'permissions.user', select: 'firstname lastname' },   // Only select firstname and lastname from user
      { path: 'permissions.role', model: 'Hierarchy', select: 'role' }, // Specify the Hierarchy model for role
      { path: 'permissions.team', select: 'team_name' }             // Only select team_name from team
    ]);
    
    
    // Check if the document was found
    if (!formDistribute) {
      return res.status(404).json({ error: 'FormDistribute not found' });
    }

    // Modify the response to only include the desired fields in permissions
    const modifiedPermissions = formDistribute.permissions.map((permission: any) => ({
      permission_type: permission.permission_type,
      user: permission.user ? {
        firstname: permission.user.firstname,
        lastname: permission.user.lastname
      } : null,
      role: permission.role ? permission.role.role : null,
      team: permission.team ? permission.team.team_name : null
    }));

    // Return the modified response
    return res.status(200).json({
      _id: formDistribute._id,
      form_id: formDistribute.form_id,
      permissions: modifiedPermissions
    });
  } catch (error) {
    // Log the error for debugging purposes
    console.error('Error retrieving FormDistribute:', error);
    return res.status(500).json({ error: 'Error retrieving FormDistribute' });
  }
};


