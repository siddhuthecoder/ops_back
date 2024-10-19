import { Request, Response } from 'express';
import Category from '../../models/Category';

// Create a new category
export const createCategory = async (req: Request, res: Response) => {
    const { category_name } = req.body;

    try {
        const newCategory = new Category({ category_name });
        await newCategory.save();
        res.status(201).json(newCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category', error });
    }
};

// Get all categories
export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await Category.find();
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching categories', error });
    }
};

// Get a single category by ID
export const getCategoryById = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category', error });
    }
};

// Update a category by ID
export const updateCategory = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { category_name } = req.body;

    try {
        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            { category_name },
            { new: true }
        );
        if (!updatedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json(updatedCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error updating category', error });
    }
};

// Delete a category by ID
export const deleteCategory = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const deletedCategory = await Category.findByIdAndDelete(id);
        if (!deletedCategory) {
            return res.status(404).json({ message: 'Category not found' });
        }
        res.status(200).json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category', error });
    }
};
