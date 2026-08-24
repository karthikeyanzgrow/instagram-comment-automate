import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import webhookRouter from './routes/webhook';
import apiRouter from './routes/api';
import { startQueueWorker } from './workers/queueWorker';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files for the dashboard
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/instagram-webhook', webhookRouter);
app.use('/api', apiRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start Server and Worker
app.listen(PORT, () => {
  console.log(`[Server] Express running on port ${PORT}`);
  
  // Start the queue worker (e.g., polling every 20 seconds)
  startQueueWorker(20000);
});
