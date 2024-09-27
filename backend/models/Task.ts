import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  task: String,
});

export const Task = mongoose.model('Task', taskSchema);
