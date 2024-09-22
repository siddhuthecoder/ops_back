import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { check, validationResult } from 'express-validator'; // Import validators
import User, { IUser } from '../models/User';
import Team, { ITeam } from '../models/Team';
import Location, { ILocation } from '../models/Location';
import sendEmail from '../utils/emailService';
import { registrationEmailTemplate } from '../utils/emailTemplate';

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Helper function to validate team and location IDs
const validateTeamsAndLocations = async (teamIds: Types.ObjectId[], locationIds: Types.ObjectId[]) => {
    const validTeams = await Team.find({ _id: { $in: teamIds } }).select('_id');
    const validLocations = await Location.find({ _id: { $in: locationIds } }).select('_id');

    return {
        validTeamIds: validTeams.map(team => team._id),
        validLocationIds: validLocations.map(location => location._id),
    };
};

// Login a user with validation
export const loginUser = [
    // Validators
    check('email').isEmail().withMessage('Please provide a valid email'),
    check('password').isLength({ min: 1 }).withMessage('Password cant Empty'),

    async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { email, password } = req.body;

            const user = await User.findOne({ email }).populate({
                path: 'role',
                model: 'Hierarchy',
            });

            if (!user) {
                res.status(400).json({ message: 'Invalid credentials' });
                return;
            }

            const isMatch = await bcrypt.compare(password, user.password as string);
            if (!isMatch) {
                res.status(400).json({ message: 'Invalid credentials' });
                return;
            }

            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET as string, { expiresIn: '30d' });

            res.json({
                token,
                user: {
                    _id: user._id,
                    firstname: user.firstname,
                    lastname: user.lastname,
                    email: user.email,
                    permissions: user.permissions,
                    role: user.role,
                    phone: user.phone,
                    status: user.status,
                },
            });
        } catch (error: any) {
            console.error('Login error:', error);
            res.status(500).json({ message: (error as Error).message });
        }
    }
];

// Get user profile
export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user?._id) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await User.findById(req.user._id)
            .populate('team', '_id team_name')
            .populate('location', '_id location_name')
            .populate({
                path: 'role',
                model: 'Hierarchy',
            })
            .select('-password');

        res.json(user);
    } catch (error: any) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update user profile with validation
export const updateUserProfile = [
    check('email').optional().isEmail().withMessage('Please provide a valid email'),
    check('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    check('firstname').optional().notEmpty().withMessage('First name cannot be empty'),
    check('lastname').optional().notEmpty().withMessage('Last name cannot be empty'),
    check('phone').optional().notEmpty().withMessage('Please provide a valid phone number'),

    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { firstname, lastname, email, password, phone, permissions, team = [], location = [], role, status } = req.body;

            if (!req.user?._id) {
                res.status(401).json({ message: 'Unauthorized' });
                return;
            }

            const user = await User.findById(req.user._id);

            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            if (firstname) user.firstname = firstname;
            if (lastname) user.lastname = lastname;
            if (email) user.email = email;
            if (phone) user.phone = phone;
            if (permissions) user.permissions = permissions;

            const { validTeamIds, validLocationIds } = await validateTeamsAndLocations(team, location);
            if (team.length !== validTeamIds.length || location.length !== validLocationIds.length) {
                res.status(400).json({ message: 'Invalid team or location IDs provided' });
                return;
            }

            if (team) {
                await Team.updateMany({ users: user._id }, { $pull: { users: user._id } });
                user.team = team;
                await Team.updateMany({ _id: { $in: team } }, { $addToSet: { users: user._id } });
            }

            if (location) {
                await Location.updateMany({ users: user._id }, { $pull: { users: user._id } });
                user.location = validLocationIds as Types.ObjectId[];
                await Location.updateMany({ _id: { $in: location } }, { $addToSet: { users: user._id } });
            }

            if (role) user.role = role;
            if (status) user.status = status;
            if (password) user.password = await bcrypt.hash(password, 10);

            await user.save();

            res.json({ message: 'Profile updated successfully', user });
        } catch (error: any) {
            res.status(500).json({ message: (error as Error).message });
        }
    }
];

// Get all users (Admin only)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
        if (!req.user?.permissions || req.user.permissions !== 'Admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        const users = await User.find()
            .populate('team', '_id team_name')
            .populate({
                path: 'role',
                model: 'Hierarchy',
            })
            .populate('location', '_id location_name')
            .select('-password');

        res.json(users);
    } catch (error: any) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Create users by admin with validation
export const createUserByAdmin = [
    check('emails').isArray({ min: 1 }).withMessage('Emails should be a non-empty array'),
    check('emails.*').isEmail().withMessage('Each email must be valid'),
    check('role').notEmpty().withMessage('Role is required'),
    check('permissions').notEmpty().withMessage('Permissions are required'),

    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { emails, role, permissions, locations = [], team = [] } = req.body;

            const { validTeamIds, validLocationIds } = await validateTeamsAndLocations(team, locations);
            if (team.length !== validTeamIds.length || locations.length !== validLocationIds.length) {
                res.status(400).json({ message: 'Invalid team or location IDs provided' });
                return;
            }

            const createdUsers: IUser[] = [];

            for (const email of emails) {
                const existingUser = await User.findOne({ email });
                if (existingUser) {
                    continue;
                }

                const user = new User({
                    email,
                    role,
                    permissions,
                    location: locations,
                    team: team,
                    status: 'InvitationSent',
                });
                await user.save();
                createdUsers.push(user);

                if (team.length > 0) {
                    await Team.updateMany({ _id: { $in: team } }, { $addToSet: { users: user._id } });
                }

                if (locations.length > 0) {
                    await Location.updateMany({ _id: { $in: locations } }, { $addToSet: { users: user._id } });
                }
                const { subject, text } = registrationEmailTemplate(String(user._id));
                await sendEmail(email, subject, text);
            }

            res.status(201).json({ message: 'Users created successfully and emails sent', createdUsers });
        } catch (error: any) {
            res.status(500).json({ message: (error as Error).message });
        }
    }
];

// Set password for user with validation
export const setPassword = [
    check('userId').isMongoId().withMessage('Invalid user ID'),
    check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    check('firstname').notEmpty().withMessage('First name is required'),
    check('lastname').notEmpty().withMessage('Last name is required'),
    check('phone').notEmpty().withMessage('Please provide a valid phone number'),
  
    async (req: Request, res: Response): Promise<void> => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }

        try {
            const { userId, password, firstname, lastname, phone } = req.body;

            const user = await User.findById(userId);
            if (!user) {
                res.status(404).json({ message: 'User not found' });
                return;
            }

            user.password = await bcrypt.hash(password, 10);
            user.firstname = firstname;
            user.lastname = lastname;
            user.phone = phone;
            user.status = 'Active';
            user.date_joined = new Date();
            await user.save();

            res.json({ message: 'Password set successfully' });
        } catch (error: any) {
            res.status(500).json({ message: (error as Error).message });
        }
    }
];
