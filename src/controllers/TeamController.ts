import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Location from '../models/Location';
import Team, { ITeam } from '../models/Team';
import User, { IUser } from '../models/User';

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
    user?: IUser;
}

// Create a new team
export const createTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        const { team_name, users = [], locations = [], parent_team } = req.body;
        const created_by = req.user?._id;

        if (!created_by) {
            return res.status(403).json({ message: 'User not authenticated' });
        }

        // Check if the user is an admin
        const user = await User.findById(req.user?._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Check if the team name is unique
        const existingTeam = await Team.findOne({ team_name });
        if (existingTeam) {
            return res.status(400).json({ message: 'Team name already exists' });
        }

        // Validate users
        for (const userId of users) {
            const userExists = await User.findById(userId);
            if (!userExists) {
                return res.status(400).json({ message: `User with ID ${userId} not found` });
            }
        }

        // Validate locations
        for (const locationId of locations) {
            const locationExists = await Location.findById(locationId);
            if (!locationExists) {
                return res.status(400).json({ message: `Location with ID ${locationId} not found` });
            }
        }

        const team = new Team({
            team_name,
            users,
            locations,
            parent_team,
            managers: [created_by],
        });

        // Save the new team
        await team.save();

        // Update the team field in each user
        if (users.length > 0) {
            await User.updateMany(
                { _id: { $in: users } },
                { $push: { team: team._id } }
            );
        }

        // Update the team field in each location
        if (locations.length > 0) {
            await Location.updateMany(
                { _id: { $in: locations } },
                { $push: { team: team._id } }
            );
        }

        // Add the team to the parent team's child_teams if parent_team is provided
        if (parent_team) {
            const parentTeam = await Team.findById(parent_team);
            console.log(parentTeam)
            if (parentTeam) {
                parentTeam.child_teams = parentTeam.child_teams || [];
                parentTeam.child_teams.push(team._id as mongoose.Types.ObjectId);
                await parentTeam.save();
            } else {
                return res.status(400).json({ message: `Parent team with ID ${parent_team} not found or is undefined` });
            }
        }

        return res.status(201).json({ message: 'Team created successfully', team });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Update a team
export const updateTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        const { teamId } = req.params;
        const { team_name, users, locations, parent_team } = req.body;

        // Check if the user is an admin
        const user = await User.findById(req.user?._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Find the team to update
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Validate users if provided
        if (users) {
            for (const userId of users) {
                const userExists = await User.findById(userId);
                if (!userExists) {
                    return res.status(400).json({ message: `User with ID ${userId} not found` });
                }
            }
            await User.updateMany(
                { _id: { $in: users } },
                { $push: { team: team._id } }
            );
            team.users = users;
        }

        // Validate locations if provided
        if (locations) {
            for (const locationId of locations) {
                const locationExists = await Location.findById(locationId);
                if (!locationExists) {
                    return res.status(400).json({ message: `Location with ID ${locationId} not found` });
                }
            }
            await Location.updateMany(
                { _id: { $in: locations } },
                { $push: { team: team._id } }
            );
            team.locations = locations;
        }

        // Update fields if provided
        if (team_name) team.team_name = team_name;

        // Handle parent team updates
        if (parent_team && parent_team.toString() !== team.parent_team?.toString()) {
            const oldParentTeam = await Team.findById(team.parent_team);
            const newParentTeam = await Team.findById(parent_team);

            if (oldParentTeam) {
                await Team.updateOne(
                    { _id: oldParentTeam._id },
                    { $pull: { child_teams: team._id } }
                );
            }

            if (newParentTeam) {
                newParentTeam.child_teams = newParentTeam.child_teams || [];
                newParentTeam.child_teams.push(team._id as mongoose.Types.ObjectId);
                await newParentTeam.save();
            } else {
                return res.status(400).json({ message: `Parent team with ID ${parent_team} not found or undefined` });
            }

            team.parent_team = parent_team;
        }

        await team.save();

        return res.json({ message: 'Team updated successfully', team });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Get all teams
export const getAllTeams = async (req: Request, res: Response): Promise<Response> => {
    try {
        const teams: ITeam[] = await Team.find()
            .populate('users', 'firstname lastname email')
            .populate('locations', 'location_name city country')
            .populate('parent_team', 'team_name')
            .populate('child_teams', 'team_name');

        return res.json(teams);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Get a specific team by ID
export const getTeamById = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { teamId } = req.params;

        const team: ITeam | null = await Team.findById(teamId)
            .populate('users', 'firstname lastname email')
            .populate('locations', 'location_name city country')
            .populate('parent_team', 'team_name')
            .populate('child_teams', 'team_name');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        return res.json(team);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

// Delete a team
export const deleteTeam = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
    try {
        const { teamId } = req.params;

        // Check if the user is an admin
        const user = await User.findById(req.user?._id);
        if (user?.permissions !== 'Admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const team = await Team.findByIdAndDelete(teamId);

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        await User.updateMany(
            { team: teamId },
            { $unset: { team: 1 } }
        );

        await Location.updateMany(
            { team: teamId },
            { $unset: { team: 1 } }
        );

        if (team.parent_team) {
            const parentTeam = await Team.findById(team.parent_team);
            if (parentTeam) {
                await Team.updateOne(
                    { _id: parentTeam._id },
                    { $pull: { child_teams: team._id } }
                );
            }
        }

        return res.json({ message: 'Team deleted successfully' });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};


// Get users by team ID
export const getUserByTeam = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { teamId } = req.params;

        // Find the team and populate its users
        const team: ITeam | null = await Team.findById(teamId).populate('users', 'firstname lastname email');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        // Extract users from the team
        const users = team.users;

        if (users?.length === 0) {
            return res.status(404).json({ message: 'No users found for this team' });
        }

        return res.json(users);
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};



export const getAllTeamsInHierarchy = async (req: Request, res: Response): Promise<Response> => {
    try {
        // Fetch all teams with their related data
        const teams: ITeam[] = await Team.find()
            .populate('users', 'firstname lastname email')  // Populate team users
            .populate({
                path: 'locations',  // Populate locations with users inside
                populate: {
                    path: 'users',  // Populate users within locations
                    select: 'firstname lastname email'  // Select user fields for locations
                },
                select: 'location_name city country'  // Select fields for locations
            })
            .populate('child_teams', '_id team_name child_teams');  // Populate child teams

        // Create a map of teams by their ID for quick access
        const teamMap = new Map<string, ITeam>();
        teams.forEach((team: any) => {
            teamMap.set(team._id.toString(), team);
        });

        // Recursive function to build the hierarchy
        const buildHierarchy = (team: ITeam): any => {
            const children = (team.child_teams || [])
                .map(id => teamMap.get(id._id.toString()))  // Fetch child teams by ID from the map
                .filter((child): child is ITeam => child !== undefined);  // Filter out undefined

            return {
                _id: team._id,
                team_name: team.team_name,
                users: team.users,
                locations: team.locations?.map((location: any) => ({
                    _id: location._id,
                    location_name: location.location_name,
                    city: location.city,
                    country: location.country,
                    users: location.users,  // Include the populated users within each location
                })),
                child_teams: children.map(buildHierarchy),  // Recursively build child teams hierarchy
            };
        };

        // Start hierarchy building from root teams (those without a parent_team)
        const hierarchy = Array.from(teamMap.values())
            .filter(team => !team.parent_team || !teamMap.has(team.parent_team.toString()))  // Ensure root teams
            .map(buildHierarchy);  // Build the hierarchy

        return res.json(hierarchy);  // Return the complete hierarchy
    } catch (error: any) {
        console.error('Error fetching teams:', error);
        return res.status(500).json({ message: error.message });
    }
};
