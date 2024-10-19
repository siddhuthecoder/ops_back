import mongoose, { Document, ObjectId } from "mongoose";

export interface ITaskComment extends Document {
  task: ObjectId;
  user: ObjectId;
  comment: string;
  date_created: Date;
}

const TaskCommentSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Task",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  date_created: {
    type: Date,
    default: Date.now,
  },
});

const TaskComment = mongoose.model<ITaskComment>("TaskComment", TaskCommentSchema);
export default TaskComment;
