import { Request, Response } from 'express';
import Location from '../models/Location';
import User, { IUser } from '../models/User';
import Team from '../models/Team';
import mongoose from 'mongoose';

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Create a new location
export const createLocation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { location_name, address, city, state, region, postal_code, country, email,phone,external_key,owners = [], team } = req.body;
        const created_by = req.user!._id; // Non-null assertion

        const user = await User.findById(req.user!._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Validate owners
        if (owners.length > 0) {
            for (let i = 0; i < owners.length; i++) {
                const ownerExists = await User.findById(owners[i]);
                if (!ownerExists) {
                    return res.status(400).json({ message: `Owner with ID ${owners[i]} not found` });
                }
            }
        }

        // Validate team
        if (team) {
            const teamExists = await Team.findById(team);
            if (!teamExists) {
                return res.status(400).json({ message: `Team with ID ${team} not found` });
            }
        }

        const location = new Location({
            location_name,
            address,
            city,
            state,
            region,
            postal_code,
            country,
            owners,
            team,
            email,
            phone,
            external_key,
            created_by
        });

        // Save the new location
        await location.save();

        // If a team is specified, update the team's locations
        if (team) {
            const teamDoc = await Team.findById(team);
            if (teamDoc && teamDoc.locations) {
                // Add this location to the team's locations list
                if (!teamDoc.locations.includes(location._id as any)) {
                    teamDoc.locations.push(location._id as any);
                    await teamDoc.save();
                }
            }
        }

        res.status(201).json({ message: 'Location created successfully', location });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

export const updateLocation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { locationId } = req.params;
        const { location_name, address, city, state, region, postal_code, country, owners, team, users } = req.body;

        // Check if user is an admin
        const user = await User.findById(req.user!._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Find the location to update
        const location = await Location.findById(locationId);
        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }

        // Update fields if provided
        if (location_name) location.location_name = location_name;
        if (address) location.address = address;
        if (city) location.city = city;
        if (state) location.state = state;
        if (region) location.region = region;
        if (postal_code) location.postal_code = postal_code;
        if (country) location.country = country;
        if (owners) location.owners = owners;
        if (team) location.team = team;
        if (users) location.users = users;

        await location.save();

        // Update the users' locations
        if (users && users.length > 0) {
            for (const userId of users) {
                const user = await User.findById(userId);
                if (user) {
                    // Initialize user.location if undefined
                    if (!user.location) {
                        user.location = [];
                    }

                    // Add location ID to user's location if not present
                    if (!user.location.includes(location._id as mongoose.Types.ObjectId)) {
                        user.location.push(location._id as mongoose.Types.ObjectId);
                        await user.save();
                    }
                }
            }
        }

        // If the team is updated, also update the team document
        if (team) {
            const teamDoc = await Team.findById(team);
            if (teamDoc && teamDoc.locations) {
                if (!teamDoc.locations.includes(location._id as mongoose.Types.ObjectId)) {
                    teamDoc.locations.push(location._id as mongoose.Types.ObjectId);
                    await teamDoc.save();
                }
            }
        }

        res.json({ message: 'Location updated successfully', location });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all locations
export const getAllLocations = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const locations = await Location.find()
            .populate('owners', 'firstname lastname email')
            .populate('team', 'team_name');

        res.json(locations);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get a specific location by ID
export const getLocationById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { locationId } = req.params;

        const location = await Location.findById(locationId)
            .populate('owners', 'firstname lastname email')
            .populate('team', 'team_name');

        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }

        res.json(location);
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete a location
export const deleteLocation = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { locationId } = req.params;

        // Check if user is an admin
        const user = await User.findById(req.user!._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const location = await Location.findByIdAndDelete(locationId);
        if (!location) {
            return res.status(404).json({ message: 'Location not found' });
        }
        // Remove this location from the associated team's locations list
        if (location.team) {
            const team = await Team.findById(location.team);
            if (team && team.locations) {
                team.locations = team.locations.filter(locId => !locId.equals(locationId));
                await team.save();
            }
        }

        res.json({ message: 'Location deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: (error as Error).message });
    }
};
