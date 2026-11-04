import mongoose, { Schema, Model } from "mongoose";
import { IParcel } from "@/lib/types";

const ParcelSchema = new Schema<IParcel>(
  {
    _id: { type: String },
    batchId: { type: String, index: true },
    batchNumber: { type: String, default: "" },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    customerName: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, index: true, trim: true }, // Primary customer tracking reference
    trackingId: { type: String, default: "", index: true, trim: true }, // Backward-compatible legacy reference
    sku: { type: String, default: "" },
    codAmount: { type: Number, required: true, default: 0 },
    serviceArea: {
      type: String,
      enum: ["Inside Valley", "Outside Valley"],
      default: "Inside Valley",
    },
    deliveryCharge: { type: Number, default: 0 },
    returnCharge: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Pending", "Delivered", "Returned", "Cancelled"],
      default: "Pending",
      index: true,
    },
    deliveryDate: { type: String },
    returnDate: { type: String },
    returnReason: { type: String, default: "" },
    customReason: { type: String, default: "" },
    returnedBy: { type: String, default: "" },
    returnRecordId: { type: String, default: "" },
    actualDeliveryCharge: { type: Number },
    actualReturnCharge: { type: Number },
    settlementId: { type: String, index: true },
    settlementStatus: {
      type: String,
      enum: ["Unsettled", "Settled"],
      default: "Unsettled",
      index: true,
    },
    remarks: { type: String, default: "" },
    createdBy: { type: String, default: "Staff" },
  },
  { timestamps: true }
);

ParcelSchema.index({ createdAt: -1 });
ParcelSchema.index({ mobile: 1, codAmount: 1, createdAt: -1 });

const Parcel: Model<IParcel> =
  mongoose.models.Parcel || mongoose.model<IParcel>("Parcel", ParcelSchema);
export default Parcel;

