import mongoose, { Schema, Model } from "mongoose";
import { IPayment } from "@/lib/types";

const PaymentSchema = new Schema<IPayment>(
  {
    _id: { type: String },
    settlementId: { type: String, index: true },
    settlementNumber: { type: String, default: "" },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    paymentDate: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      default: "Bank Transfer",
    },
    referenceNumber: { type: String, default: "" },
    remarks: { type: String, default: "" },
    allocationMethod: {
      type: String,
      enum: ["auto_oldest", "specific_settlement", "unallocated_credit"],
      default: "auto_oldest",
    },
    allocations: [
      {
        settlementId: { type: String, required: true },
        settlementNumber: { type: String, default: "" },
        allocatedAmount: { type: Number, required: true },
      },
    ],
    unallocatedAmount: { type: Number, default: 0 },
    recordedBy: { type: String, default: "Admin" },
  },
  { timestamps: true }
);

PaymentSchema.index({ paymentDate: -1 });

const Payment: Model<IPayment> =
  mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema);
export default Payment;

