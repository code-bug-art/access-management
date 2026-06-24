// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const AuditLogSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  decision: { type: String, enum: ['ALLOW', 'DENY'], required: true },
  reason: { type: String, required: true },
  matchedRole: { type: String, default: null },
  createdAt: { type: Date, default: () => new Date(), index: true },
});

export const AuditLogModel: Model<any> = mongoose.models.AuditLog ?? mongoose.model('AuditLog', AuditLogSchema);
