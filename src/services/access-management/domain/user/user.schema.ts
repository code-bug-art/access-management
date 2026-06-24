// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const UserSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String, required: true },
  orgUnitId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', required: true },
  designationKey: { type: String, default: null }, // job title; drives approval authority
  // Reporting line (supervisor). Drives approval routing, independent of the org-unit tree.
  managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  roleIds: { type: [Schema.Types.ObjectId], ref: 'Role', default: [] },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
});
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

export const UserModel: Model<any> = mongoose.models.User ?? mongoose.model('User', UserSchema);
