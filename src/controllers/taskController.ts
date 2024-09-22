import { Request, Response } from "express";
import mongoose, { Document, ObjectId } from "mongoose";
import schedule from "node-schedule";
import Project from "../models/Project";
import Task from "../models/Task";
import User, { IUser } from "../models/User";
import sendEmail from "../utils/emailService";
import {
  commentNotificationEmailTemplate,
  missedTaskEmailTemplate,
  taskCompletionEmailTemplate,
  taskReminderEmailTemplate,
} from "../utils/emailTemplate";

// Define a custom Request type to include the user property
interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface PopulatedTask extends Document {
  assign_to: IUser[] | ObjectId[]; // Updated to array
  created_by: IUser | ObjectId;
  followers: IUser[] | ObjectId[];
  title: string;
  comments: Array<{
    user: ObjectId;
    comment: string;
    date_created: Date;
  }>;
}

// Create Task
export const createTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      description,
      assign_to,
      location,
      due_date,
      followers,
      team,
      project
    } = req.body;

    // Create new task
    const newTask = new Task({
      title,
      description,
      assign_to: assign_to.map((id: string) => new mongoose.Types.ObjectId(id)), // Handle array
      location: new mongoose.Types.ObjectId(location),
      team: team ? new mongoose.Types.ObjectId(team) : undefined,
      project: project ? new mongoose.Types.ObjectId(project) : undefined,
      due_date,
      created_by: req.user?._id,
      followers: followers.map((id: string) => new mongoose.Types.ObjectId(id)),
      date_start: new Date(),
    });

    // Save task to database
    const savedTask = await newTask.save();
    if (project) {
      const foundProject = await Project.findById(project);

      if (foundProject) {
        // Add task to the project and increment the number of tasks
        foundProject.tasks.push(savedTask._id as mongoose.Types.ObjectId);
        foundProject.no_of_tasks = (foundProject.no_of_tasks || 0) + 1;

        // Save the updated project
        await foundProject.save();
      } else {
        return res.status(404).json({ message: "Project not found" });
      }
    }
    // Schedule reminder 1 day before the due date
    scheduleReminder(savedTask);

    return res.status(201).json(savedTask);
  } catch (error) {
    return res.status(500).json({ message: "Error creating task", error });
  }
};

// Update Task Status (Set to Missed after the due date)
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update task status to Missed if the due date has passed
    if (new Date() > task.due_date && task.current_status !== "Completed") {
      task.current_status = "Missed";
    }

    const updatedTask = await task.save();
    return res.status(200).json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: "Error updating task", error });
  }
};

// Type guard to check if a field is populated (i.e., has an 'email' field)
const isPopulatedUser = (user: any): user is IUser =>
  user && typeof user.email === "string";

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

// CRUD operations for tasks

// Get All Tasks
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await Task.find().populate([
      {
        path: "created_by assign_to followers",
        select: "id email firstname lastname",
      },
      {
        path: "location",
        select: "address city state region postal_code country",
      },
      {
        path: "team",
        select: "team_name",
      },
    ]);
    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching tasks", error });
  }
};

// Get Task by ID
export const getTaskById = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate([
      {
        path: "created_by assign_to followers",
        select: "id email firstname lastname",
      },
      {
        path: "location",
        select: "address city state region postal_code country",
      },
      {
        path: "team",
        select: "team_name",
      },
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    return res.status(200).json(task);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching task", error });
  }
};

// Update Task
export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const {
      title,
      description,
      assign_to,
      location,
      due_date,
      followers,
      team,
      project
    } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      {
        title,
        description,
        assign_to: assign_to.map((id: string) => new mongoose.Types.ObjectId(id)), // Handle array
        location: new mongoose.Types.ObjectId(location),
        due_date,
        team: team ? new mongoose.Types.ObjectId(team) : undefined,
        project: project ? new mongoose.Types.ObjectId(project) : undefined,
        followers: followers.map((id: string) => new mongoose.Types.ObjectId(id)),
      },
      { new: true }
    );

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    if (project) {
      const foundProject = await Project.findById(project);

      if (foundProject) {
        // Add task to the project and increment the number of tasks
        foundProject.tasks.push(updatedTask._id as mongoose.Types.ObjectId); // Use updatedTask._id
        foundProject.no_of_tasks = (foundProject.no_of_tasks || 0) + 1;

        // Save the updated project
        await foundProject.save();
      } else {
        return res.status(404).json({ message: "Project not found" });
      }
    }

    // Reschedule reminder after task is updated
    scheduleReminder(updatedTask);

    return res.status(200).json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: "Error updating task", error });
  }
};


// Delete Task (Mark as Deleted)
export const deleteTask = async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update task status to Deleted instead of removing it
    task.current_status = "Deleted";
    await task.save();

    // Cancel scheduled jobs for the task
    if (task._id instanceof mongoose.Types.ObjectId) {
      schedule.cancelJob(task._id.toString());
      schedule.cancelJob(task._id.toString() + "-missed");
    }

    return res
      .status(200)
      .json({ message: "Task marked as deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error deleting task", error });
  }
};

// Add Comment to Task
export const addCommentToTask = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { taskId } = req.params;
    const { comment, notifyUsers } = req.body; // notifyUsers will contain additional user IDs

    // Find the task and populate assign_to, created_by, and followers
    const task = await Task.findById(taskId)
      .populate("assign_to", "email firstname") // Populate assign_to
      .populate("created_by", "email firstname lastname") // Populate created_by
      .populate("followers", "email firstname lastname") // Populate followers
      .exec();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Add comment to the task
    task.comments.push({
      user: req.user?._id as mongoose.Types.ObjectId,
      comment,
      date_created: new Date(),
    });

    await task.save();

    // Notify users via email
    const commenterName = `${req.user?.firstname} ${req.user?.lastname}`;
    const taskTitle = task.title;

    // Collect recipients: assign_to, created_by, followers
    const recipients: string[] = [];

    task.assign_to.forEach((user: any) => {
      if (isPopulatedUser(user)) {
        recipients.push(user.email);
      }
    });

    if (isPopulatedUser(task.created_by)) {
      recipients.push(task.created_by.email);
    }

    task.followers.forEach((follower) => {
      if (isPopulatedUser(follower)) {
        recipients.push(follower.email);
      }
    });

    // If notifyUsers array is provided in the request body, fetch these users
    if (notifyUsers && notifyUsers.length > 0) {
      const additionalUsers = await User.find({
        _id: { $in: notifyUsers },
      }).select("email firstname lastname");

      // Extract the email from the additionalUsers
      recipients.push(...additionalUsers.map((user) => user.email));
    }

    // Send email to all unique recipients
    const uniqueRecipients = Array.from(new Set(recipients));
    console.log({ uniqueRecipients });

    for (const email of uniqueRecipients) {
      const { subject, text } = commentNotificationEmailTemplate(
        taskTitle,
        comment,
        commenterName
      );
      await sendEmail(email, subject, text);
    }

    return res.status(200).json(task);
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error adding comment to task", error });
  }
};

// Get Tasks by User, Location, and Team
export const getTasksByFilter = async (req: Request, res: Response) => {
  try {
    const { user, location, team, project } = req.query;

    const filter: any = {};

    // Check if user is provided
    if (user && typeof user === "string") {
      filter.assign_to = new mongoose.Types.ObjectId(user);
    }

    // Check if location is provided
    if (location && typeof location === "string") {
      filter.location = new mongoose.Types.ObjectId(location);
    }

    // Check if team is provided
    if (team && typeof team === "string") {
      filter.team = new mongoose.Types.ObjectId(team);
    }

    // Check if project is provided
    if (project && typeof project === "string") {
      filter.project = new mongoose.Types.ObjectId(project);
    }

    const tasks = await Task.find(filter).populate([
      {
        path: "created_by assign_to followers",
        select: "id email firstname lastname",
      },
      {
        path: "location",
        select: "address city state region postal_code country",
      },
      {
        path: "team",
        select: "team_name",
      },
      {
        path: "project", // Populate project details
        select: "title",
      },
    ]);

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching tasks", error });
  }
};


export const taskCompletion = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { taskId } = req.params;

    // Find the task and populate the necessary fields
    const task = await Task.findById(taskId).populate([
      {
        path: "created_by",
        select: "email firstname lastname", // Select email field
      },
      {
        path: "followers",
        select: "email firstname lastname", // Select email field
      },
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update task status to Completed
    task.current_status = "Completed";
    const updatedTask = await task.save();

    // Prepare to send notification emails
    const recipients: string[] = [];

    // Add created_by email if populated
    if (task.created_by && typeof (task.created_by as any).email === "string") {
      recipients.push((task.created_by as any).email);
    }

    // Add followers email if populated
    task.followers.forEach((follower: any) => {
      if (follower && typeof follower.email === "string") {
        recipients.push(follower.email);
      }
    });

    // Send email to all unique recipients
    const uniqueRecipients = Array.from(new Set(recipients));
    for (const email of uniqueRecipients) {
      const { subject, text } = taskCompletionEmailTemplate(updatedTask.title);
      await sendEmail(email, subject, text);
    }

    return res.status(200).json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: "Error completing task", error });
  }
};
