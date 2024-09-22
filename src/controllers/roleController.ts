import { Request, Response } from 'express';
import Hierarchy from '../models/Role';

// Create a new hierarchy role (Admin only)
export const createHierarchyRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { role, reports_to, level, permissions } = req.body;
        // Check if the role already exists
        const existingRole = await Hierarchy.findOne({ role });
        if (existingRole) {
            res.status(400).json({ message: 'Role already exists' });
            return;
        }

        // Create the new role
        const newRole = new Hierarchy({
            role,
            reports_to,
            level,
            permissions
        });

        await newRole.save();
        res.status(201).json({ message: 'Hierarchy role created successfully', role: newRole });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all hierarchy roles
export const getAllHierarchyRoles = async (req: Request, res: Response): Promise<void> => {
    try {
        const roles = await Hierarchy.find().populate('reports_to', 'role');
       

        // Create a map of roles by ID
        const roleMap = roles.reduce((map, role) => {
            map[role.id.toString()] = { ...role.toObject(), children: [] };
            return map;
        }, {} as Record<string, any>);

        // Build the hierarchy tree
        const hierarchy: any[] = [];
        roles.forEach(role => {
            if (role.reports_to) {
                const parentRole = roleMap[role.reports_to._id.toString()];
                if (parentRole) {
                    parentRole.children.push(roleMap[role.id.toString()]);
                }
            } else {
                hierarchy.push(roleMap[role.id.toString()]);
            }
        });

        res.json(hierarchy);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update a hierarchy role (Admin only)
export const updateHierarchyRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { role, reports_to, level, permissions } = req.body;
       
        const updatedRole = await Hierarchy.findByIdAndUpdate(req.params.id, {
            role,
            reports_to,
            level,
            permissions
        }, { new: true });

        if (!updatedRole) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        res.json({ message: 'Hierarchy role updated successfully', role: updatedRole });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete a hierarchy role (Admin only)
export const deleteHierarchyRole = async (req: Request, res: Response): Promise<void> => {
    try {
       
        const deletedRole = await Hierarchy.findByIdAndDelete(req.params.id);

        if (!deletedRole) {
            res.status(404).json({ message: 'Role not found' });
            return;
        }

        res.json({ message: 'Hierarchy role deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
