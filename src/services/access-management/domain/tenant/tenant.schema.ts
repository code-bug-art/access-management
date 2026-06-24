// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const TenantSchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  // Bumped on any role/permission change -> invalidates the compiled-policy cache.
  policyVersion: { type: Number, default: 1 },
});

export const TenantModel: Model<any> = mongoose.models.Tenant ?? mongoose.model('Tenant', TenantSchema);
