// -------- Packages -------- //
import mongoose from 'mongoose';
// -------- Config -------- //
import { config } from './config';

export const connectDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.mongoUri);
};
