import mongoose, { Schema, Model } from "mongoose";
import { IBatch } from "@/lib/types";

const BatchSchema = new Schema<IBatch>(
  {
    _id: { type: String },
    batchNumber: { type: String, required: true, unique: true, index: true },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    batchDate: { type: String, required: true, index: true },
    totalPackages: { type: Number, default: 0 },
    totalCOD: { type: Number, default: 0 },
    deliveredCount: { type: Number, default: 0 },
    returnedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },
    settlementStatus: {
      type: String,
      enum: ["Unsettled", "Partially Settled", "Settled"],
      default: "Unsettled",
      index: true,
    },
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "Staff" },
  },
  { timestamps: true }
);

BatchSchema.index({ batchDate: -1 });

const Batch: Model<IBatch> =
  mongoose.models.Batch || mongoose.model<IBatch>("Batch", BatchSchema);
export default Batch;

