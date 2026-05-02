import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI ?? 'mongodb://mongo:27017/surfsapp';
  await mongoose.connect(uri);
  console.log('MongoDB connected');
}
