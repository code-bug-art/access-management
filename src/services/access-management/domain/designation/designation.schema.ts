// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const DesignationSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  key: { type: String, required: true }, // e.g. "ceo", "manager", "engineer"
  title: { type: String, required: true }, // e.g. "Chief Executive Officer"
  level: { type: Number, required: true }, // seniority rank (lower = more senior)
  approvalLimit: { type: Number, default: null }, // approval matrix; null = unlimited
});
DesignationSchema.index({ tenantId: 1, key: 1 }, { unique: true });

export const DesignationModel: Model<any> =
  mongoose.models.Designation ?? mongoose.model('Designation', DesignationSchema);
