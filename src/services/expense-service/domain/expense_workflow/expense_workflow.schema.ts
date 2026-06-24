// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const StepSchema = new Schema(
  {
    order: { type: Number, required: true },
    name: { type: String, required: true },
    minAmount: { type: Number, default: 0 },
    roleId: { type: String, required: true }, // references an access-management role
    roleName: { type: String, required: true },
  },
  { _id: false }
);

const ExpenseWorkflowSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, unique: true },
  steps: { type: [StepSchema], default: [] },
});

export const ExpenseWorkflowModel: Model<any> =
  mongoose.models.ExpenseWorkflow ?? mongoose.model('ExpenseWorkflow', ExpenseWorkflowSchema);
