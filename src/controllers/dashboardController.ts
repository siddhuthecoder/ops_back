import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Task from '../models/Task';
import Team from '../models/Team';

const getChildTeamIds = async (teamId: mongoose.Types.ObjectId): Promise<mongoose.Types.ObjectId[]> => {
  const team = await Team.findById(teamId);
  if (!team || !team.child_teams || team.child_teams.length === 0) {
    return [teamId];
  }

  const childTeamIds: mongoose.Types.ObjectId[] = [teamId];

  for (const childTeamId of team.child_teams) {
    const subChildIds = await getChildTeamIds(childTeamId);
    childTeamIds.push(...subChildIds);
  }

  return childTeamIds;
};

// Helper function to get the start and end of the current week
const getWeekRange = () => {
  const today = new Date();
  const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday
  firstDayOfWeek.setHours(0, 0, 0, 0);

  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6); // Saturday
  lastDayOfWeek.setHours(23, 59, 59, 999);

  return { firstDayOfWeek, lastDayOfWeek };
};

export const getTeamTasks = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { teamId } = req.params;
    let teamIds: mongoose.Types.ObjectId[] = [];

    if (teamId) {
      // Get the IDs of the team and all its child teams
      teamIds = await getChildTeamIds(new mongoose.Types.ObjectId(teamId));
    } else {
      // If no team is provided, return all tasks
      teamIds = (await Team.find({}).distinct('_id')) as mongoose.Types.ObjectId[]; // Cast the result to ObjectId[]
    }

    // Get the tasks for the given team and all its child teams
    const tasks = await Task.find({ team: { $in: teamIds } });

    // Get the current date and week range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { firstDayOfWeek, lastDayOfWeek } = getWeekRange();

    // Filter tasks based on their status and due date
    const activeTasks = tasks.filter(task => task.current_status === 'Active');
    const missedTasks = tasks.filter(task => task.current_status === 'Missed');
    const completedTasks = tasks.filter(task => task.current_status === 'Completed');
    const inProgressTasks = tasks.filter(task => task.current_status === 'inProgress');
    
    const todayTasks = tasks.filter(task => task.due_date && task.due_date >= today && task.due_date <= new Date());
    const weekTasks = tasks.filter(task => task.due_date && task.due_date >= firstDayOfWeek && task.due_date <= lastDayOfWeek);

    const totalTasks = tasks.length;

    return res.json({
      activeTasks: activeTasks.length,
      missedTasks: missedTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      totalTasks,
      todayTasks: todayTasks.length,
      weekTasks: weekTasks.length, // New field for tasks due this week
    });
  } catch (error) {
    console.error('Error fetching tasks for the team:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
