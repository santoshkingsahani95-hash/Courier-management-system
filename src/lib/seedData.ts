import bcrypt from "bcryptjs";
import { ICourier, IUser, IBatch, IParcel, ISettlement, IPayment, ILedgerEntry } from "./types";

export function getInitialCouriers(): ICourier[] {
  return [
    {
      _id: "c-001",
      name: "Google Express",
      serviceArea: "Inside Valley",
      contactPerson: "Ramesh Sharma",
      phone: "9801122334",
      defaultDeliveryCharge: 70,
      defaultReturnCharge: 0,
      status: "active",
      notes: "Inside Kathmandu valley deliveries. Daily 3 PM pickup.",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "c-002",
      name: "KDM Express",
      serviceArea: "Inside Valley",
      contactPerson: "Sita Thapa",
      phone: "9811223344",
      defaultDeliveryCharge: 150,
      defaultReturnCharge: 0,
      status: "active",
      notes: "Ring road & sub-valley coverage (Bhaktapur, Lalitpur).",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "c-003",
      name: "SP Express",
      serviceArea: "Inside Valley",
      contactPerson: "Bikash Shrestha",
      phone: "9821223344",
      defaultDeliveryCharge: 150,
      defaultReturnCharge: 0,
      status: "active",
      notes: "Express inner city small parcel deliveries.",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "c-004",
      name: "Nepal Can Move",
      serviceArea: "Outside Valley",
      contactPerson: "Sunil KC",
      phone: "9841223344",
      defaultDeliveryCharge: 250,
      defaultReturnCharge: 0,
      status: "active",
      notes: "All major districts outside Kathmandu valley (Pokhara, Biratnagar, Narayangarh).",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
  ];
}

export function getInitialUsers(): IUser[] {
  const hash = bcrypt.hashSync(process.env.DEFAULT_ADMIN_PASSWORD || "Santosh@143", 10);
  const mgrHash = bcrypt.hashSync("manager123", 10);
  const staffHash = bcrypt.hashSync("staff123", 10);

  return [
    {
      _id: "u-001",
      name: "Santosh Mukhiya (Admin)",
      email: process.env.DEFAULT_ADMIN_EMAIL || "santoshkingsahani95@gmail.com",
      passwordHash: hash,
      role: "admin",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "u-002",
      name: "Pooja Gurung (Manager)",
      email: "manager@courier.com",
      passwordHash: mgrHash,
      role: "manager",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
    {
      _id: "u-003",
      name: "Amit Rai (Staff)",
      email: "staff@courier.com",
      passwordHash: staffHash,
      role: "staff",
      status: "active",
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    },
  ];
}

export function getInitialBatches(): IBatch[] {
  return [];
}

export function getInitialParcels(): IParcel[] {
  return [];
}

export function getInitialSettlements(): ISettlement[] {
  return [];
}

export function getInitialPayments(): IPayment[] {
  return [];
}

export function getInitialLedger(): ILedgerEntry[] {
  return [];
}
