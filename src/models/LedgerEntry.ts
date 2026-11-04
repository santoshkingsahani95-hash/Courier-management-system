import mongoose, { Schema, Model } from "mongoose";
import { ILedgerEntry } from "@/lib/types";

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    _id: { type: String },
    courierId: { type: String, required: true, index: true },
    courierName: { type: String, default: "" },
    transactionDate: { type: String, required: true, index: true },
    transactionType: {
      type: String,
      enum: [
        "Opening Balance",
        "COD Receivable",
        "Delivery Charge",
        "Return Charge",
        "Adjustment",
        "Payment Received",
        "Settlement Finalized",
        "Settlement Due",
      ],
      required: true,
    },
    referenceId: { type: String, default: "" },
    description: { type: String, required: true },
    debit: { type: Number, default: 0 }, // increases courier liability to us (COD)
    credit: { type: Number, default: 0 }, // decreases courier liability (Charges, Payments)
    runningBalance: { type: Number, required: true }, // positive = Courier owes us
  },
  { timestamps: true }
);

LedgerEntrySchema.index({ courierId: 1, transactionDate: 1 });

const LedgerEntry: Model<ILedgerEntry> =
  mongoose.models.LedgerEntry ||
  mongoose.model<ILedgerEntry>("LedgerEntry", LedgerEntrySchema);
export default LedgerEntry;

