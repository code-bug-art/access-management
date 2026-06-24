// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const OrgUnitSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['company', 'division', 'department', 'team'], default: 'department' },
  parentId: { type: Schema.Types.ObjectId, ref: 'OrgUnit', default: null },
  // Materialized path of ancestor ids (root-first) for O(1) subtree membership checks.
  ancestors: { type: [Schema.Types.ObjectId], default: [] },
  headUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
});

export const OrgUnitModel: Model<any> = mongoose.models.OrgUnit ?? mongoose.model('OrgUnit', OrgUnitSchema);
