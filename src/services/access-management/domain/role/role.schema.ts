// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const ConditionSchema = new Schema(
  { type: { type: String, enum: ['ownerOnly', 'sameOrgUnit', 'inOrgSubtree', 'isManagerOf'], required: true } },
  { _id: false }
);

const GrantSchema = new Schema(
  {
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    condition: { type: ConditionSchema, default: null },
    maxAmount: { type: Number, default: null }, // approval matrix; null = unlimited
    denySelf: { type: Boolean, default: false }, // separation of duties
  },
  { _id: false }
);

const RoleSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true, index: true },
  name: { type: String, required: true },
  parentRoleId: { type: Schema.Types.ObjectId, ref: 'Role', default: null }, // single-parent inheritance
  grants: { type: [GrantSchema], default: [] },
});

export const RoleModel: Model<any> = mongoose.models.Role ?? mongoose.model('Role', RoleSchema);
