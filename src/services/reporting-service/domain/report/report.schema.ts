// -------- Packages -------- //
import mongoose, { Schema, type Model } from 'mongoose';

const ReportSchema = new Schema({
  tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
  ownerId: { type: Schema.Types.ObjectId, required: true },
  orgUnitId: { type: Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
});

export const ReportModel: Model<any> = mongoose.models.Report ?? mongoose.model('Report', ReportSchema);
