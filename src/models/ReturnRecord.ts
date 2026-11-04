import mongoose, { Schema, Model } from "mongoose";
import { IReturnRecord } from "@/lib/types";

const ReturnRecordSchema = new Schema<IReturnRecord>(
  {
    _id: { type: String },
    parcelId: { type: String, required: true, index: true },
    batchId: { type: String, required: true, index: true },
    batchNumber: { type: String, default: "" },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    customerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, index: true, trim: true },
    trackingId: { type: String, default: "", trim: true },
    sku: { type: String, default: "" },
    codAmount: { type: Number, required: true, default: 0 },
    returnDate: { type: String, required: true, index: true },
    returnReason: { type: String, required: true },
    customReason: { type: String, default: "" },
    returnStatus: {
      type: String,
      enum: ["Returned", "Reverted"],
      default: "Returned",
      index: true,
    },
    recordedBy: { type: String, default: "Staff" },
  },
  { timestamps: true }
);

ReturnRecordSchema.index({ courierId: 1, returnDate: -1 });

const ReturnRecord: Model<IReturnRecord> =
  mongoose.models.ReturnRecord ||
  mongoose.model<IReturnRecord>("ReturnRecord", ReturnRecordSchema);

export default ReturnRecord;
