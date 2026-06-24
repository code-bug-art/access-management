// -------- Packages -------- //
import mongoose from 'mongoose';
// -------- Config -------- //
import { config } from './config';

/** Open the shared Mongo connection used by the domain DAOs. */
export const connectDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.mongoUri);
};
