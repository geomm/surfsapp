import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './db/connection.js';
import { beachesRouter } from './routes/beaches';
import { startScheduler } from './scheduler';
import { adminRouter } from './routes/admin';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/', beachesRouter);
app.use('/admin', adminRouter);

app.get('/health', (_req, res) => {
  const mongoState = mongoose.connection.readyState;
  const mongo = mongoState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', mongo, timestamp: new Date().toISOString() });
});

connectDB()
  .then(() => {
    startScheduler();
  })
  .catch((err: unknown) => {
    console.error('MongoDB connection error:', err);
  });

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server shut down gracefully');
    process.exit(0);
  });
});
