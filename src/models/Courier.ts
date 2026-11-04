import mongoose, { Schema, Model } from "mongoose";
import { ICourier } from "@/lib/types";

const CourierSchema = new Schema<ICourier>(
  {
    _id: { type: String },
    name: { type: String, required: true, trim: true },
    serviceArea: {
      type: String,
      enum: ["Inside Valley", "Outside Valley", "Both"],
      default: "Inside Valley",
    },
    contactPerson: { type: String, default: "" },
    phone: { type: String, default: "" },
    defaultDeliveryCharge: { type: Number, default: 0 },
    defaultReturnCharge: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

CourierSchema.index({ name: 1 });
CourierSchema.index({ status: 1 });

const Courier: Model<ICourier> =
  mongoose.models.Courier || mongoose.model<ICourier>("Courier", CourierSchema);
export default Courier;

