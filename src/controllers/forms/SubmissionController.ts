import { Request, Response } from 'express';
import Submission from '../../models/Submission'; // Assuming the Submission schema is in the 'models' directory
import { IUser } from '../../models/User'; // Assuming the User schema is available
// import { IComment } from '../../models/Submission';
import mongoose from 'mongoose'; // Assuming the User schema is available
import Task from "../../models/Task";
interface AuthenticatedRequest extends Request {
  user?: IUser;
}


const checkConditions=async()=>{
  return true
}
const triggerHandler=async()=>{
  
}
const fieldsSavingandScore=async()=>{
  
}
export const createSubmission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      form_id,
      task_id,
      location_id,
      project_id,
      submitted_location, // should contain latitude and longitude
    } = req.body;

    console.log(req.body)
    const submitted_by = req.user!._id || null; 
    console.log(submitted_by)
    const task = await Task.findById(task_id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // 2. Calculate the time taken for submission
    const taskCreationDate = task.date_start;
    const currentDate = new Date();
    const timeTaken = Math.abs(currentDate.getTime() - taskCreationDate.getTime()) / 1000; // Time in seconds
     
    const isValid=await checkConditions();
    if(isValid===false){
      return res.status(500).json({ message: 'There are some configure conditions failed for submissions' });
    }
    // 3. Create a new submission
    const newSubmission = new Submission({
      form_id,
      task_id,
      location_id,
      project_id,
      submitted_location, // {latitude: number, longitude: number}
      submitted_by,
      time_taken: timeTaken, // Use the calculated time taken
    });

    await newSubmission.save();
    task.submission_id = newSubmission._id as mongoose.Types.ObjectId;
    console.log(task)
    await task.save();
    fieldsSavingandScore();
    triggerHandler();

    return res.status(201).json({ message: 'Submission created successfully', submission: newSubmission });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error creating submission', error });
    
  }
};


// Get all submissions
export const getAllSubmissions = async (req: Request, res: Response) => {
  try {
    const submissions = await Submission.find().populate('task_id').populate('location_id').populate('project_id').populate('submitted_by', 'firstname lastname email');
    return res.status(200).json(submissions);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching submissions', error });
  }
};

export const getSubmissions = async (req: Request, res: Response) => {
    try {
      const {
        task_id,
        form_id,
        user_id,
        project_id,
        location_id,
      } = req.query;
  
      // Build the query object
      const query: any = {}; // Using 'any' to avoid TypeScript issues
  
      // Add filters to the query based on the provided query parameters
      if (task_id) {
        query.task_id = new mongoose.Types.ObjectId(task_id as string);
      }
  
      if (form_id) {
        query.form_id = new mongoose.Types.ObjectId(form_id as string);
      }
  
      if (user_id) {
        query.submitted_by = new mongoose.Types.ObjectId(user_id as string);
      }
  
      if (project_id) {
        query.project_id = new mongoose.Types.ObjectId(project_id as string);
      }
  
      if (location_id) {
        query.location_id = new mongoose.Types.ObjectId(location_id as string);
      }
  
      // Fetch submissions based on the constructed query
      const submissions = await Submission.find(query)
        .populate("task_id") // Populate task information if needed
        .populate("form_id") // Populate form information if needed
        .populate("submitted_by") // Populate user information if needed
        .populate("project_id") // Populate project information if needed
        .populate("location_id"); // Populate location information if needed
  
      return res.status(200).json({ submissions });
    } catch (error) {
      return res.status(500).json({ message: 'Error retrieving submissions', error });
    }
  };

// Get submission by ID
export const getSubmissionById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id).populate('form_id').populate('task_id').populate('location_id').populate('project_id').populate('submitted_by', 'firstname lastname email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    return res.status(200).json(submission);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching submission', error });
  }
};

// Update a submission by ID
export const updateSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const submission = await Submission.findByIdAndUpdate(id, updatedData, { new: true });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    return res.status(200).json({ message: 'Submission updated successfully', submission });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating submission', error });
  }
};


// Add a comment to a submission
export const addCommentToSubmission = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { comment } = req.body;
  
      // Find the submission by ID
      const submission = await Submission.findById(id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }
  
      // Create a new comment object
      const newComment: any = {
        user: new mongoose.Types.ObjectId(req.user!._id as string), // Ensure the user ID is a valid ObjectId
        comment,
        date_created: new Date(),
      };
  
      // Add the new comment to the submission
      submission.comments.push(newComment);
      
      // Save the submission with the updated comments
      await submission.save();
  
      return res.status(200).json({ message: "Comment added successfully", submission });
    } catch (error) {
      return res.status(500).json({ message: "Error adding comment", error });
    }
  };

// Get all comments for a submission
export const getSubmissionComments = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findById(id).populate('comments.user', 'firstname lastname email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    return res.status(200).json(submission.comments);
  } catch (error) {
    return res.status(500).json({ message: 'Error fetching comments', error });
  }
};
