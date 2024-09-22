import { Request, Response } from "express";
import Project from "../models/Project"; // Adjust path if needed
import { IUser } from "../models/User";
import Team from "../models/Team";
import moment from "moment";
import Task from "../models/Task"; // Importing the Task model
import User from "../models/User"; // Importing the User model
import schedule from "node-schedule";
import sendEmail from "../utils/emailService";
import {
  missedTaskEmailTemplate,
  taskReminderEmailTemplate,
} from "../utils/emailTemplate";

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: IUser;
}
const isPopulatedUser = (user: any): user is IUser =>
  user && typeof user.email === "string";

// Helper function to calculate dates based on recurrence
const calculateRecurrenceDates = (recurrence: any, startDate: Date) => {
  const tasks: { start: Date; due: Date }[] = [];
  const { frequency, interval, byweekday } = recurrence;

  const taskDueTime = "23:59"; // Default task due time

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
      for (let i = 0; i < interval; i++) {
        const start = new Date(startDate);
        const due = new Date(start);
        due.setDate(start.getDate() + i);
        tasks.push({ start, due });
      }
      break;

    case "weekly":
      for (let i = 0; i < interval; i++) {
        const start = new Date(startDate);
        byweekday.forEach((day: number) => {
          const weeklyStart = new Date(start);
          weeklyStart.setDate(weeklyStart.getDate() + (day - start.getDay()));
          const weeklyDue = new Date(
            `${weeklyStart.toISOString().split("T")[0]}T${taskDueTime}`
          );
          tasks.push({ start: weeklyStart, due: weeklyDue });
        });
      }
      break;

    case "monthly":
      for (let i = 0; i < interval; i++) {
        const start = new Date(startDate);
        const due = new Date(start);
        due.setMonth(start.getMonth() + i);
        tasks.push({ start, due });
      }
      break;

    case "yearly":
      for (let i = 0; i < interval; i++) {
        const start = new Date(startDate);
        const due = new Date(start);
        due.setFullYear(start.getFullYear() + i);
        tasks.push({ start, due });
      }
      break;

    default:
      break;
  }

  return tasks;
};



// Schedule a reminder 1 day before the due date and missed task handling
const scheduleReminder = (task: any) => {
  const reminderDate = new Date(task.due_date);
  reminderDate.setDate(reminderDate.getDate() - 1); // Set reminder to 1 day before

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

// Main project creation function (updated)
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
      locations_at,
      followers,
      recurrence,
    } = req.body;

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
        .json({ error: "Invalid recurrence frequency type" });
    }

    const mainTeam = await Team.findById(team).exec();
    if (!mainTeam) {
      return res.status(404).json({ error: "Main team not found" });
    }

    const childTeams = await Team.find({ parent_team: team }).exec();
    let allLocations: any = [];
    const parentTasks: any[] = []; // Array to hold tasks for the parent project

    const childProjects = await Promise.all(
      childTeams.map(async (childTeam) => {
        const locations =
          locations_at?.filter((loc: any) =>
            childTeam.locations?.includes(loc)
          ) || childTeam.locations;
        allLocations = [...allLocations, ...locations];

        const childProject = new Project({
          title: `${title} - ${childTeam.team_name}`,
          instruction,
          team: childTeam._id,
          assigned_role,
          locations_at: locations,
          no_of_tasks: locations.length,
          followers,
          recurrence,
          created_by: req.user!._id,
          date_created: Date.now(),
          date_modified: Date.now(),
        });

        const savedChildProject = await childProject.save();

        // Find users based on the assigned role
        const assignedUsers = await User.find({ role: assigned_role }).exec();
        const assignedUserIds = assignedUsers.map((user) => user._id);

        const tasks: any[] = [];

        // Create a task for each location
        await Promise.all(
          locations.map(async (location: any) => {
            const taskRecurrenceDates = calculateRecurrenceDates(
              recurrence,
              new Date()
            );

            return Promise.all(
              taskRecurrenceDates.map(async (taskDate) => {
                const task = new Task({
                  title: `${title} - Task for ${childTeam.team_name} at ${location.location_name}`,
                  description: `Task for project: ${title} at ${location.location_name}`,
                  created_by: req.user!._id,
                  due_date: taskDate.due,
                  date_start: taskDate.start,
                  assign_to: assignedUserIds, // Assigning found users
                  followers,
                  team: childTeam._id,
                  project: savedChildProject._id,
                  location: location,
                  is_active: true,
                  is_closed: false,
                  is_expired: false,
                  current_status: "Active",
                  date_created: Date.now(),
                });

                const savedTask = await task.save();
                tasks.push(savedTask);
                parentTasks.push(savedTask);

                // Schedule reminder and missed task handling
                scheduleReminder(savedTask);
              })
            );
          })
        );

        savedChildProject.tasks = tasks;
        await savedChildProject.save();

        return { project: savedChildProject, tasks };
      })
    );

    // Create the parent project
    const parentProject = new Project({
      title: `${title} - Parent Project`,
      instruction,
      team: mainTeam._id,
      assigned_role,
      locations_at: allLocations,
      no_of_tasks: allLocations.length,
      followers,
      recurrence,
      created_by: req.user!._id,
      date_created: Date.now(),
      date_modified: Date.now(),
      tasks: parentTasks,
    });

    const savedParentProject = await parentProject.save();

    res.status(201).json({
      message: "Projects and tasks created successfully",
      parentProject: savedParentProject,
      childProjects,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
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

// Update a project by ID
export const updateProject = async (req: Request, res: Response) => {
  try {
    const {
      title,
      instruction,
      team,
      assigned_role,
      locations_at,
      followers,
      recurrence,
    } = req.body;

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      {
        title,
        instruction,
        team,
        assigned_role,
        locations_at,
        followers,
        recurrence: recurrence
          ? {
              frequency: recurrence.frequency,
              interval: recurrence.interval,
              byweekday: recurrence.byweekday,
              custom_attrs: {
                dtstart_local: recurrence.custom_attrs?.dtstart_local || "",
                start_initial_project_now:
                  recurrence.custom_attrs?.start_initial_project_now || false,
              },
            }
          : undefined,
        date_modified: Date.now(),
      },
      { new: true }
    ).populate("team assigned_role locations_at followers");

    if (!updatedProject) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.status(200).json(updatedProject);
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
