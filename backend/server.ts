import dotenv from 'dotenv';
dotenv.config(); // Ensure this is called first

const mongoUri = process.env.MONGODB_URI;
import express from 'express';
import mqtt from 'mqtt';
import Redis from 'ioredis';
import mongoose from 'mongoose';
import { Task } from './models/Task';
import bodyParser from 'body-parser';
import cors from 'cors';

// Check for required environment variables
if (!process.env.REDIS_HOST || !process.env.REDIS_PORT || !process.env.REDIS_USER || !process.env.REDIS_PASSWORD || !process.env.MONGODB_URI || !process.env.MQTT_BROKER) {
  throw new Error('Missing required environment variables');
}
if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }
const app = express();
app.use(cors());
app.use(bodyParser.json());

const redis = new Redis({
  host: process.env.REDIS_HOST as string,
  port: parseInt(process.env.REDIS_PORT as string, 10),
  username: process.env.REDIS_USER as string,
  password: process.env.REDIS_PASSWORD as string,
});

const mqttClient = mqtt.connect(process.env.MQTT_BROKER as string);

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe('/add', (err) => {
    if (err) {
      console.error('MQTT subscription error:', err);
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  if (topic === '/add') {
    const task = message.toString();
    const currentTasks = JSON.parse(await redis.get('FULLSTACK_TASK_<YOUR_FIRST_NAME>') || '[]');
    currentTasks.push(task);

    if (currentTasks.length > 50) {
      await Task.insertMany(currentTasks.map((task) => ({ task })));
      await redis.del('FULLSTACK_TASK_<YOUR_FIRST_NAME>');
    } else {
      await redis.set('FULLSTACK_TASK_<YOUR_FIRST_NAME>', JSON.stringify(currentTasks));
    }
  }
});

app.get('/fetchAllTasks', async (req, res) => {
  const cachedTasks = JSON.parse(await redis.get('FULLSTACK_TASK_<YOUR_FIRST_NAME>') || '[]');
  const dbTasks = await Task.find({});
  const allTasks = [...cachedTasks, ...dbTasks.map(task => task.task)];
  res.json(allTasks);
});

mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
    .then(() => {
      console.log('Connected to MongoDB');
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
    });