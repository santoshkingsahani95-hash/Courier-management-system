import mongoose, { Schema, Model } from "mongoose";
import { IAuditLog } from "@/lib/types";

const AuditLogSchema = new Schema<IAuditLog>(
  {
    _id: { type: String },
    userId: { type: String, default: "" },
    userName: { type: String, default: "System" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: "" },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    timestamp: { type: String, default: () => new Date().toISOString() },
  },
  { timestamps: true }
);

AuditLogSchema.index({ timestamp: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;

