import mongoose, { Schema, Model } from "mongoose";
import { ISettlement } from "@/lib/types";

const SettlementSchema = new Schema<ISettlement>(
  {
    _id: { type: String },
    settlementNumber: { type: String, required: true, unique: true, index: true },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    fromDate: { type: String, required: true },
    toDate: { type: String, required: true },
    deliveredParcelsCount: { type: Number, default: 0 },
    returnedParcelsCount: { type: Number, default: 0 },
    grossCOD: { type: Number, required: true, default: 0 },
    deliveryCharges: { type: Number, required: true, default: 0 },
    returnCharges: { type: Number, required: true, default: 0 },
    adjustments: { type: Number, default: 0 },
    adjustmentNotes: { type: String, default: "" },
    currentNetReceivable: { type: Number, required: true, default: 0 },
    previousDue: { type: Number, default: 0 },
    totalReceivable: { type: Number, required: true, default: 0 },
    totalPaid: { type: Number, default: 0 },
    remainingDue: { type: Number, required: true, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
      index: true,
    },
    parcelIds: [{ type: String }],
    notes: { type: String, default: "" },
    createdBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

SettlementSchema.index({ createdAt: -1 });

const Settlement: Model<ISettlement> =
  mongoose.models.Settlement ||
  mongoose.model<ISettlement>("Settlement", SettlementSchema);
export default Settlement;

