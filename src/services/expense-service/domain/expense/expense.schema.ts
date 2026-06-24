// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const ChainStepSchema = new Schema(
  {
    order: { type: Number, required: true },
    name: { type: String, required: true },
    roleId: { type: String, required: true },
    roleName: { type: String, required: true },
    state: { type: String, enum: ['pending', 'approved'], default: 'pending' },
    approverId: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false }
);

const ExpenseSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, required: true },
  orgUnitId: { type: Schema.Types.ObjectId, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected'], default: 'draft' },
  chain: { type: [ChainStepSchema], default: [] }, // snapshot of the workflow at submit time
  currentStep: { type: Number, default: 0 },
});

export const ExpenseModel: Model<any> = mongoose.models.Expense ?? mongoose.model('Expense', ExpenseSchema);
