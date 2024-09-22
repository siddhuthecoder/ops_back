import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import User, { IUser } from '../models/User';

interface AuthRequest extends Request {
    user?: IUser; // Typing the user with IUser interface
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

            // Get user from token
            req.user = await User.findById(decoded._id).select('-password');
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    } else {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Check if user is Admin
export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.permissions === 'Admin') {
        return next();
    } else {
        return res.status(403).json({ message: 'Access denied, admin only' });
    }
};

// Check if user is Manager
export const isManager = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.permissions === 'Manager') {
        return next();
    } else {
        return res.status(403).json({ message: 'Access denied, manager only' });
    }
};

// Check if user is Submitter
export const isSubmitter = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.permissions === 'Submitter') {
        return next();
    } else {
        return res.status(403).json({ message: 'Access denied, submitter only' });
    }
};
