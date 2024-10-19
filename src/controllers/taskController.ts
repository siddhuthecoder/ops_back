import { Request, Response } from "express";
import fs from "fs";
import mongoose, { Document, ObjectId } from "mongoose";
import schedule from "node-schedule";
import path from "path";
import XLSX from "xlsx";
import Project from "../models/Project";
import Task from "../models/Task";
import TaskComment from "../models/TaskComment";
import User, { IUser } from "../models/User";
import sendEmail from "../utils/emailService";

import {
  commentNotificationEmailTemplate,
  missedTaskEmailTemplate,
  taskCompletionEmailTemplate,
  taskReminderEmailTemplate,
} from "../utils/emailTemplate";

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

interface PopulatedTask extends Document {
  assign_to: IUser[] | ObjectId[]; 
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
      project,
      form_id // Add form_id to the request body
    } = req.body;
  
    const image_urls = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
    console.log(image_urls);
    
    const isValidObjectId = (id:any) => mongoose.Types.ObjectId.isValid(id) && (id.length === 24);

    if (form_id && !isValidObjectId(form_id)) {
      return res.status(400).json({ message: "Invalid form_id" });
    }

    // Create new task with form_id
    const newTask = new Task({
      title,
      description,
      image_urls,
      assign_to: assign_to ? new mongoose.Types.ObjectId(assign_to) : undefined,
      location: new mongoose.Types.ObjectId(location),
      team: team ? new mongoose.Types.ObjectId(team) : undefined,
      project: project ? new mongoose.Types.ObjectId(project) : undefined,
      form_id: form_id ? new mongoose.Types.ObjectId(form_id) : undefined, // Add form_id to the task
      due_date,
      created_by: req.user?._id,
      followers: followers.map((id: string) => new mongoose.Types.ObjectId(id)),
      date_start: new Date(),
    });
    
    // Save task to database
    const savedTask = await newTask.save();
   console.log(savedTask)
    if (project) {
      const foundProject = await Project.findById(project);

      if (foundProject) {
        // Add task to the project and increment the number of tasks
      
        foundProject.no_of_tasks = (foundProject.no_of_tasks || 0) + 1;

        // Save the updated project
        await foundProject.save();
      } else {
        return res.status(404).json({ message: "Project not found" });
      }
    }

    // Schedule reminder for the task
    scheduleReminder(savedTask);

    return res.status(201).json(savedTask);
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Error creating task", error });
    
  }
};





// Type guard to check if a field is populated (i.e., has an 'email' field)
const isPopulatedUser = (user: any): user is IUser =>
  user && typeof user.email === "string";

// Schedule a reminder 1 day before the due date and missed task handling
const scheduleReminder = (task: any) => {
  const reminderDate = new Date(task.due_date);
  reminderDate.setDate(reminderDate.getDate() - 1); // Set reminder to 1 day before
  console.log({task})
  // Reminder job
  schedule.scheduleJob(task._id.toString(), reminderDate, async () => {
    const taskTitle = task.title;
    const recipients: string[] = [];

    // Directly access the assign_to field
    if (isPopulatedUser(task.assign_to)) {
      recipients.push(task.assign_to.email);
    }

    if (isPopulatedUser(task.created_by)) {
      recipients.push(task.created_by.email);
    }

    // Loop through the followers array
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

        // Directly access assign_to field
        if (isPopulatedUser(foundTask.assign_to)) {
          recipients.push(foundTask.assign_to.email);
        }

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
      project,
      form_id // Add form_id to the request body
    } = req.body;
    
    // Find the existing task
    const existingTask = await Task.findById(taskId);
    if (!existingTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Handle image updates: Keep existing images if no new images are uploaded
    const newImages = req.files ? (req.files as Express.Multer.File[]).map(file => file.filename) : [];
    const updatedImages = newImages.length > 0 ? [...existingTask.image_urls, ...newImages] : existingTask.image_urls;

    // Create updated task object
    const updatedTaskData: any = {
      title: title || existingTask.title,
      description: description || existingTask.description,
      image_urls: updatedImages, // Add updated image URLs
      assign_to: assign_to ? new mongoose.Types.ObjectId(assign_to) : existingTask.assign_to,
      location: location ? new mongoose.Types.ObjectId(location) : existingTask.location,
      due_date: due_date || existingTask.due_date,
      team: team ? new mongoose.Types.ObjectId(team) : existingTask.team,
      project: project ? new mongoose.Types.ObjectId(project) : existingTask.project,
      form_id: form_id ? new mongoose.Types.ObjectId(form_id) : existingTask.form_id, // Add form_id update
      updated_at: new Date(), // Track update time
    };

    // Handle followers update if present
    if (followers && Array.isArray(followers)) {
      updatedTaskData.followers = followers.map((id: string) => new mongoose.Types.ObjectId(id));
    } else {
      updatedTaskData.followers = existingTask.followers; // Keep existing followers if not updating
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(taskId, updatedTaskData, { new: true });

    if (!updatedTask) {
      return res.status(404).json({ message: "Error updating task: Task not found after update." });
    }

    // Handle project tasks update
    if (project) {
      const foundProject = await Project.findById(project);
      if (foundProject) {
        // const isTaskInProject = foundProject.tasks.some((taskId: mongoose.Types.ObjectId) =>
        //   taskId.equals(updatedTask._id as mongoose.Types.ObjectId)
        // );
        // if (!isTaskInProject) {
        //   // foundProject.tasks.push(updatedTask._id as mongoose.Types.ObjectId);
        //   foundProject.no_of_tasks = (foundProject.no_of_tasks || 0) + 1;
        //   await foundProject.save();
        // }
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


// Get All Tasks
export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await Task.find({}, 'title description image_urls date_submitted due_date')
      .populate([
        {
          path: "assign_to",
          select: "id email firstname lastname",
          options: { limit: 1 }, 
        },
        {
          path: "location",
          select: "address city state region postal_code country",
        }
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
        path: "created_by assign_to followers submitted_by",
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



export const getTasksByFilter = async (req: Request, res: Response) => {
  try {
    const { user, location, team, project, status, assignedDate, startDate, endDate } = req.query;

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

    // Check if status is provided
    if (status && typeof status === "string") {
      filter.current_status = status;
    }

    // Check if assignedDate is provided
    if (assignedDate && typeof assignedDate === "string") {
      filter.date_created = { $gte: new Date(assignedDate) };
    }

    // Check for due date range
    if (startDate && endDate) {
      // Handle potential string array or single string
      const start = Array.isArray(startDate) ? startDate[0] : startDate;
      const end = Array.isArray(endDate) ? endDate[0] : endDate;

      // Ensure they are both strings before converting to Date
      if (typeof start === "string" && typeof end === "string") {
        filter.due_date = { $gte: new Date(start), $lte: new Date(end) };
      }
    }

    const tasks = await Task.find(filter, 'title description image_urls date_submitted due_date').populate([
      {
        path: "assign_to",
        select: "id email firstname lastname",
        options: { limit: 1 }, // Limits the number of assign_to entries returned
      },
      {
        path: "location",
        select: "address city state region postal_code country",
      }
    ]);

    return res.status(200).json(tasks);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching tasks", error });
  }
};


export const taskCompletion = async (
  req: Request,
  res: Response
) => {
  try {
    console.log('Request received for task completion');
    const { taskId } = req.params;
    const { userId } = req.body; // Extract userId from the request body
    console.log(userId,taskId)
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    // Check if userId is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid User ID" });
    }

    // Find the task and populate the necessary fields
    const task = await Task.findById(taskId).populate([
      {
        path: "created_by",
        select: "email firstname lastname", 
      },
      {
        path: "followers",
        select: "email firstname lastname", 
      },
    ]);

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Update task status to Completed
    task.current_status = "Completed";

    // Update the submitted_by to the userId from req.body and set date_submitted to the current date
    task.submitted_by = new mongoose.Types.ObjectId(userId);
    task.date_submitted = new Date();

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


// Add Comment to Task
export const addCommentToTask = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { taskId } = req.params;
    const { comment, notifyUsers } = req.body; 

    // Create new comment
    const newComment = new TaskComment({
      task: taskId,
      user: req.user?._id,
      comment,
      date_created: new Date(),
    });

    await newComment.save();

    const task = await Task.findById(taskId)
      .populate("assign_to", "email firstname lastname") // Now a single user
      .populate("created_by", "email firstname lastname")
      .populate("followers", "email firstname lastname")
      .exec();

    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    const commenterName = `${req.user?.firstname} ${req.user?.lastname}`;
    const taskTitle = task.title;
    const recipients: string[] = [];

    // Directly access the assign_to field (single user)
    if (isPopulatedUser(task.assign_to)) {
      recipients.push(task.assign_to.email);
    }

    // Add created_by user if populated
    if (isPopulatedUser(task.created_by)) {
      recipients.push(task.created_by.email);
    }

    // Add followers' emails if they exist and are populated
    task.followers.forEach((follower) => {
      if (isPopulatedUser(follower)) {
        recipients.push(follower.email);
      }
    });

    // If notifyUsers array is provided, add those users as well
    if (notifyUsers && notifyUsers.length > 0) {
      const additionalUsers = await User.find({
        _id: { $in: notifyUsers },
      }).select("email firstname lastname");
      recipients.push(...additionalUsers.map((user) => user.email));
    }

    // Remove duplicate recipients
    const uniqueRecipients = Array.from(new Set(recipients));
    console.log({ uniqueRecipients });

    // Send email notifications to unique recipients
    for (const email of uniqueRecipients) {
      const { subject, text } = commentNotificationEmailTemplate(
        taskTitle,
        comment,
        commenterName
      );
      await sendEmail(email, subject, text);
    }

    return res.status(201).json({
      message: "Comment added successfully",
      comment: newComment,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error adding comment", error });
  }
};


export const getCommentsForTask = async (
  req: Request,
  res: Response
) => {
  try {
    const { taskId } = req.params;

    // Retrieve comments for the specific task
    const comments = await TaskComment.find({ task: taskId })
      .populate("user", "email firstname lastname") // Populate user details
      .sort({ date_created: -1 }); // Sort by date_created in descending order

    return res.status(200).json(comments);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching comments", error });
  }
};



export const exportTaskAsExcel = async (req: Request, res: Response): Promise<void> => {
  try {
      const { id: userId } = req.params;

      // Find the user who requested the export
      const requestingUser = await User.findById(userId);
      if (!requestingUser || !requestingUser.email) {
          res.status(404).json({ message: "Requesting user not found or has no email" });
          return;
      }

      // Fetch all tasks and select required fields
      const tasks = await Task.find()
      .select("title description current_status created_by submitted_by assign_to due_date date_start date_submitted followers")
      .populate([
          {
              path: "created_by",
              select: "id email firstname lastname",
              model: "User"
          },
          {
              path: "submitted_by",
              select: "id email firstname lastname",
              model: "User"
          },
          {
              path: "assign_to",
              select: "id email firstname lastname",
              model: "User"
          },
          {
              path: "followers",
              select: "id email firstname lastname",
              model: "User"
          }
      ]);

      if (!tasks || tasks.length === 0) {
          res.status(404).json({ message: "No tasks found to export" });
          return;
      }

      // Prepare data for Excel
      const excelData = tasks.map(task => ({
          title: task.title || '',
          description: task.description || '',
          current_status: task.current_status || '',
          created_by: typeof task.created_by === 'object' && task.created_by !== null ? (task.created_by as any).email : 'N/A',
          submitted_by: typeof task.submitted_by === 'object' && task.submitted_by !== null ? (task.submitted_by as any).email : 'N/A',
          assign_to: typeof task.assign_to === 'object' && task.assign_to !== null ? (task.assign_to as any).email : 'N/A',
          due_date: task.due_date ? task.due_date.toISOString().split('T')[0] : '',
          date_start: task.date_start ? task.date_start.toISOString().split('T')[0] : '',
          date_submitted: task.date_submitted ? task.date_submitted.toISOString().split('T')[0] : 'N/A',
      }));

      // Create a worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);

      // Create a new workbook and append the worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");

      // Define a file path to save the Excel file temporarily
      const exportDir = path.join(__dirname, '../../exports');

      // Check if the exports directory exists, if not, create it
      if (!fs.existsSync(exportDir)) {
          fs.mkdirSync(exportDir);
      }

      const filePath = path.join(exportDir, `tasks_${Date.now()}.xlsx`);

      // Write the Excel file to the server temporarily
      XLSX.writeFile(workbook, filePath);

      // Prepare the email
      const subject = "Task Export";
      const text = "Here is the exported list of all tasks in Excel format.";
      const attachments = [{ filename: "tasks_export.xlsx", path: filePath }];

      // Adjust the sendEmail function call according to its definition
      await sendEmail(requestingUser.email, subject, text, attachments);  // Check the definition of sendEmail

      // Delete the file after sending the email
      fs.unlink(filePath, (err) => {
          if (err) {
              console.error("Error deleting the file:", err);
          }
      });

      res.status(200).json({ message: "Task export successful, Excel file sent via email." });
  } catch (error: any) {
      console.error("Export error:", error);
      res.status(500).json({ message: error.message });
  }
};

