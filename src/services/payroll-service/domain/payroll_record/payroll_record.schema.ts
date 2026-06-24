// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const PayrollRecordSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, required: true },
  orgUnitId: { type: Schema.Types.ObjectId, required: true },
  grossPay: { type: Number, required: true },
});

export const PayrollRecordModel: Model<any> =
  mongoose.models.PayrollRecord ?? mongoose.model('PayrollRecord', PayrollRecordSchema);
