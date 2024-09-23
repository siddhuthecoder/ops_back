import { Request, Response } from "express";
import mongoose from "mongoose";
import schedule from "node-schedule";
import Project from "../models/Project"; // Adjust path if needed
import Task from "../models/Task"; // Importing the Task model
import Team from "../models/Team";
import User, { IUser } from "../models/User"; // Importing the User model
import sendEmail from "../utils/emailService";
import {
  missedTaskEmailTemplate,
  taskReminderEmailTemplate,
  taskActivationEmailTemplate,
} from "../utils/emailTemplate";

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: IUser;
}
const isPopulatedUser = (user: any): user is IUser =>
  user && typeof user.email === "string";

// Helper function to calculate dates based on recurrence
// Helper function to calculate dates based on recurrence and due_type
const calculateRecurrenceDates = (recurrence: any, startDate: Date) => {
  const tasks: { start: Date; due: Date }[] = [];
  const { frequency, interval, byweekday, due_type, after, date } = recurrence;

  const taskDueTime = "23:59"; // Default task due time
  let currentDate = new Date(startDate);

  const isBeforeEndDate = (dueDate: Date, endDate: Date) => dueDate <= endDate;

  switch (frequency) {
    case "once":
      tasks.push({
        start: startDate,
        due: new Date(
          `${startDate.toISOString().split("T")[0]}T${taskDueTime}`
        ),
      });
      break;

    case "daily":
      if (due_type === "After") {
        for (let i = 0; i < after; i++) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setDate(currentDate.getDate() + interval);
        }
      } else if (due_type === "Date") {
        const endDate = new Date(date);
        while (isBeforeEndDate(currentDate, endDate)) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setDate(currentDate.getDate() + interval);
        }
      }
      break;

    case "weekly":
      if (due_type === "After") {
        for (let i = 0; i < after; i++) {
          byweekday.forEach((day: number) => {
            const start = new Date(currentDate);
            start.setDate(start.getDate() + (day - start.getDay()));
            const due = new Date(
              `${start.toISOString().split("T")[0]}T${taskDueTime}`
            );
            tasks.push({ start, due });
          });
          currentDate.setDate(currentDate.getDate() + 7 * interval);
        }
      } else if (due_type === "Date") {
        const endDate = new Date(date);
        while (isBeforeEndDate(currentDate, endDate)) {
          byweekday.forEach((day: number) => {
            const start = new Date(currentDate);
            start.setDate(start.getDate() + (day - start.getDay()));
            const due = new Date(
              `${start.toISOString().split("T")[0]}T${taskDueTime}`
            );
            if (isBeforeEndDate(start, endDate)) {
              tasks.push({ start, due });
            }
          });
          currentDate.setDate(currentDate.getDate() + 7 * interval);
        }
      }
      break;

    case "monthly":
      if (due_type === "After") {
        for (let i = 0; i < after; i++) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setMonth(currentDate.getMonth() + interval);
        }
      } else if (due_type === "Date") {
        const endDate = new Date(date);
        while (isBeforeEndDate(currentDate, endDate)) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setMonth(currentDate.getMonth() + interval);
        }
      }
      break;

    case "yearly":
      if (due_type === "After") {
        for (let i = 0; i < after; i++) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setFullYear(currentDate.getFullYear() + interval);
        }
      } else if (due_type === "Date") {
        const endDate = new Date(date);
        while (isBeforeEndDate(currentDate, endDate)) {
          const start = new Date(currentDate);
          const due = new Date(
            `${start.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start, due });
          currentDate.setFullYear(currentDate.getFullYear() + interval);
        }
      }
      break;

    default:
      break;
  }

  console.log({ tasks });
  return tasks;
};

// Schedule a reminder 1 day before the due date and missed task handling
const scheduleReminder = (task: any, projectName: string) => {
  const reminderDate = new Date(task.due_date);
  reminderDate.setDate(reminderDate.getDate() - 1); // Set reminder to 1 day before

  // Job to mark task as active at the date_start
  schedule.scheduleJob(
    task._id.toString() + "-active",
    task.date_start,
    async () => {
      const foundTask = await Task.findById(task._id);
      if (foundTask && foundTask.current_status !== "Completed") {
        foundTask.current_status = "Active"; // Set status to Active
        await foundTask.save();

        // Notify users of task activation
        const recipients: string[] = [];

        foundTask.assign_to.forEach((user: any) => {
          if (isPopulatedUser(user)) {
            recipients.push(user.email);
          }
        });

        if (isPopulatedUser(foundTask.created_by)) {
          recipients.push(foundTask.created_by.email);
        }

        const uniqueRecipients = Array.from(new Set(recipients));
        for (const email of uniqueRecipients) {
          const { subject, text } = taskActivationEmailTemplate(
            foundTask.title,
            projectName
          );
          await sendEmail(email, subject, text);
        }

        console.log(`Task "${foundTask.title}" is now Active.`);
      }
    }
  );

  // Reminder job
  schedule.scheduleJob(task._id.toString(), reminderDate, async () => {
    const taskTitle = task.title;
    const recipients: string[] = [];

    // Loop through assign_to array
    for (const user of task.assign_to) {
      if (isPopulatedUser(user)) {
        recipients.push(user.email);
      }
    }

    if (isPopulatedUser(task.created_by)) {
      recipients.push(task.created_by.email);
    }

    task.followers.forEach((follower: any) => {
      if (isPopulatedUser(follower)) {
        recipients.push(follower.email);
      }
    });

    // Send reminder emails to unique recipients
    const uniqueRecipients = Array.from(new Set(recipients));
    for (const email of uniqueRecipients) {
      const { subject, text } = taskReminderEmailTemplate(
        taskTitle,
        task.due_date
      );
      await sendEmail(email, subject, text);
    }

    console.log(`Reminder: Task "${taskTitle}" is due in 1 day.`);
  });

  // Job to mark task as missed after the due date
  schedule.scheduleJob(
    task._id.toString() + "-missed",
    task.due_date,
    async () => {
      const foundTask = await Task.findById(task._id).populate([
        "assign_to",
        "created_by",
        "followers",
      ]);

      if (foundTask && foundTask.current_status !== "Completed") {
        foundTask.current_status = "Missed";
        await foundTask.save();

        // Notify users of missed task
        const recipients: string[] = [];

        foundTask.assign_to.forEach((user: any) => {
          if (isPopulatedUser(user)) {
            recipients.push(user.email);
          }
        });

        if (isPopulatedUser(foundTask.created_by)) {
          recipients.push(foundTask.created_by.email);
        }

        foundTask.followers.forEach((follower: any) => {
          if (isPopulatedUser(follower)) {
            recipients.push(follower.email);
          }
        });

        const uniqueRecipients = Array.from(new Set(recipients));
        for (const email of uniqueRecipients) {
          const { subject, text } = missedTaskEmailTemplate(foundTask.title);
          await sendEmail(email, subject, text);
        }

        console.log(`Task "${foundTask.title}" has been marked as Missed.`);
      }
    }
  );
};

export const createProject = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const {
      title,
      instruction,
      team,
      assigned_role,
      locations_at = [],
      followers,
      recurrence,
    } = req.body;

    // Validate required fields
    if (!title || !instruction || !team || !assigned_role || !recurrence) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Validate recurrence type
    const validRecurrenceTypes = [
      "once",
      "daily",
      "weekly",
      "monthly",
      "yearly",
    ];
    if (!validRecurrenceTypes.includes(recurrence?.frequency)) {
      return res
        .status(400)
        .json({ error: "Invalid recurrence frequency type." });
    }

    // Fetch main team details
    const mainTeam = await Team.findById(team).exec();
    if (!mainTeam) {
      return res.status(404).json({ error: "Main team not found." });
    }

    // Fetch child teams of the main team
    const childTeams = await Team.find({ parent_team: team }).exec();
    const allTeams = [mainTeam, ...childTeams];

    console.log(mainTeam.locations);
    console.log(locations_at);
    // Initialize allLocations and fetch relevant locations based on the input
    let allLocations: any[] = [];

    if (locations_at.length > 0) {
      // Filter to get only valid locations from locations_at that exist in mainTeam.locations
      const validLocations = locations_at.filter((locId: string) =>
        mainTeam.locations?.some((teamLoc: any) => teamLoc.equals(locId))
      );

      // If valid locations are found, set allLocations to them
      if (validLocations.length > 0) {
        allLocations = validLocations.map(
          (id: string) => new mongoose.Types.ObjectId(id)
        ); // Convert string to ObjectId
      }
    } else {
      allLocations = mainTeam.locations || [];
    }

    // console.log(allLocations)
    // Helper function to find assigned users by role
    const getAssignedUserIds = async (role: string) => {
      const assignedUsers = await User.find({ role }).exec();
      return assignedUsers.map((user) => user._id);
    };

    // Create tasks for the team and their locations
    const createTasksForLocations = async (
      team: any,
      locations: any[],
      assignedUserIds: any[]
    ) => {
      const tasks: any[] = [];
      await Promise.all(
        locations.map(async (location) => {
          const taskRecurrenceDates = calculateRecurrenceDates(
            recurrence,
            new Date()
          );
          await Promise.all(
            taskRecurrenceDates.map(async (taskDate) => {
              const task = new Task({
                title: `${title} - Task for ${team.team_name} at ${location.location_name}`,
                description: `Task for project: ${title} at ${location.location_name}`,
                created_by: req.user!._id,
                due_date: taskDate.due,
                date_start: taskDate.start,
                assign_to: assignedUserIds,
                followers,
                team: team._id,
                location,
                project: null,
                is_active: true,
                current_status: "Active",
                date_created: Date.now(),
              });
              const savedTask = await task.save();
              tasks.push(savedTask);

              // Schedule reminder and missed task handling
              scheduleReminder(savedTask, title);
            })
          );
        })
      );
      return tasks;
    };

    // If no child teams exist, create parent project and tasks directly for main team
    if (childTeams.length === 0) {
      const assignedUserIds = await getAssignedUserIds(assigned_role);
      const tasks = await createTasksForLocations(
        mainTeam,
        allLocations,
        assignedUserIds
      );

      // Create parent project
      const parentProject = new Project({
        title: `${title} - Parent Project`,
        instruction,
        team: mainTeam._id,
        assigned_role,
        locations_at: allLocations,
        no_of_tasks: tasks.length,
        followers,
        recurrence,
        created_by: req.user!._id,
        date_created: Date.now(),
        date_modified: Date.now(),
        tasks,
      });

      const savedParentProject = await parentProject.save();

      // Link tasks to the parent project
      await Task.updateMany(
        { _id: { $in: tasks.map((task) => task._id) } },
        { project: savedParentProject._id }
      );

      return res.status(201).json({
        message: "Parent project and tasks created successfully.",
        parentProject: savedParentProject,
      });
    }

    // Proceed with child project creation if child teams exist
    // Proceed with child project creation if child teams exist
    const parentTasks: any[] = [];
    const childProjectIds: mongoose.Types.ObjectId[] = [];

    await Promise.all(
      childTeams.map(async (childTeam) => {
        let childLocations;

        if (locations_at.length > 0) {
          // Use locations_at if provided and filter it based on child team's locations
          childLocations = locations_at.filter((locId: string) =>
            childTeam.locations?.some((teamLoc: any) =>
              teamLoc._id.equals(locId)
            )
          );
        } else {
          // Use all locations of the child team if locations_at is not provided
          childLocations = childTeam.locations || [];
        }

        // Collect all locations for the parent project
        allLocations = [...new Set([...allLocations, ...childLocations])];

        // Create child project
        const childProject = new Project({
          title: `${title} - ${childTeam.team_name}`,
          instruction,
          team: childTeam._id,
          assigned_role,
          locations_at: childLocations,
          no_of_tasks: childLocations.length,
          followers,
          recurrence,
          created_by: req.user!._id,
          date_created: Date.now(),
          date_modified: Date.now(),
        });

        const savedChildProject = await childProject.save();
        childProjectIds.push(savedChildProject._id as mongoose.Types.ObjectId);

        // Find assigned users for child teams
        const assignedUserIds = await getAssignedUserIds(assigned_role);

        // Create tasks for the child team
        const childTasks = await createTasksForLocations(
          childTeam,
          childLocations,
          assignedUserIds
        );
        parentTasks.push(...childTasks);

        // Update child project with created tasks
        savedChildProject.tasks = childTasks;
        savedChildProject.no_of_tasks = childTasks.length;
        await Task.updateMany(
          { _id: { $in: childTasks.map((task) => task._id) } },
          { project: savedChildProject._id } // Set project ID for child tasks
        );
        await savedChildProject.save();
      })
    );

    // Create the parent project
    const parentProject = new Project({
      title: `${title} - Parent Project`,
      instruction,
      team: mainTeam._id,
      assigned_role,
      locations_at: allLocations,
      no_of_tasks: parentTasks.length,
      followers,
      recurrence,
      created_by: req.user!._id,
      date_created: Date.now(),
      date_modified: Date.now(),
      tasks: parentTasks,
      child_projects: childProjectIds,
    });

    const savedParentProject = await parentProject.save();

    // Update all child projects with the parent project ID
    await Project.updateMany(
      { _id: { $in: childProjectIds } },
      { parent_project: savedParentProject._id }
    );

    res.status(201).json({
      message: "Projects and tasks created successfully.",
      parentProject: savedParentProject,
      childProjects: await Project.find({ _id: { $in: childProjectIds } }),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Get all projects
export const getAllProjects = async (req: Request, res: Response) => {
  try {
    const projects = await Project.find().populate(
      "team assigned_role locations_at followers"
    );
    res.status(200).json(projects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get a single project by ID
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const project = await Project.findById(req.params.id).populate(
      "team assigned_role locations_at followers"
    );
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a project by ID
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const deletedProject = await Project.findByIdAndDelete(req.params.id);
    if (!deletedProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Fetch all projects without a parent (i.e., parent_project is null)
export const getParentProjects = async (req: Request, res: Response) => {
  try {
    const parentProjects = await Project.find({ parent_project: null });
    res.status(200).json(parentProjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching parent projects", error });
  }
};

// Fetch all projects with a specific parent project ID
export const getChildProjects = async (req: Request, res: Response) => {
  try {
    const { parentProjectId } = req.params;

    if (!parentProjectId) {
      return res.status(400).json({ message: "parentProjectId is required" });
    }

    const childProjects = await Project.find({
      parent_project: parentProjectId,
    });
    res.status(200).json(childProjects);
  } catch (error) {
    res.status(500).json({ message: "Error fetching child projects", error });
  }
};
