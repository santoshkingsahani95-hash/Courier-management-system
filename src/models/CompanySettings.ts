import mongoose, { Schema, Model } from "mongoose";
import { ICompanySettings } from "@/lib/types";

interface ICompanySettingsDocument extends ICompanySettings {
  _id: string;
}

const CompanySettingsSchema = new Schema<ICompanySettingsDocument>(
  {
    _id: { type: String, default: "company_settings" },
    companyName: { type: String, required: true },
    logoUrl: { type: String, default: "" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    panVat: { type: String, default: "" },
    footerMessage: { type: String, default: "" },
    authorizedPerson: { type: String, default: "" },
  },
  { timestamps: true }
);

const CompanySettings: Model<ICompanySettingsDocument> =
  mongoose.models.CompanySettings ||
  mongoose.model<ICompanySettingsDocument>("CompanySettings", CompanySettingsSchema);

export default CompanySettings;

