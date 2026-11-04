import fs from "fs";
import path from "path";
import {
  ICourier,
  IUser,
  IBatch,
  IParcel,
  ISettlement,
  IPayment,
  IPaymentAllocation,
  PaymentAllocationMethod,
  ILedgerEntry,
  IAuditLog,
  ICompanySettings,
} from "./types";
import {
  getInitialCouriers,
  getInitialUsers,
  getInitialBatches,
  getInitialParcels,
  getInitialSettlements,
  getInitialPayments,
  getInitialLedger,
} from "./seedData";
import { connectToDatabase, isMongoConnected } from "./db";
import { objectCache, cacheCrawler } from "./cache";
import User from "@/models/User";
import Courier from "@/models/Courier";
import Batch from "@/models/Batch";
import Parcel from "@/models/Parcel";
import Settlement from "@/models/Settlement";
import Payment from "@/models/Payment";
import LedgerEntry from "@/models/LedgerEntry";
import AuditLog from "@/models/AuditLog";
import CompanySettings from "@/models/CompanySettings";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDirectoryExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultData: T[]): T[] {
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), "utf8");
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading ${filename}:`, e);
    return defaultData;
  }
}

function writeJsonFile<T>(filename: string, data: T[]): void {
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

/* ==================== AUDIT LOGS ==================== */
export async function addAuditLog(log: Omit<IAuditLog, "_id" | "timestamp">) {
  const timestamp = new Date().toISOString();
  try {
    if (await connectToDatabase()) {
      await AuditLog.create({ ...log, timestamp });
      return;
    }
  } catch (e) {
    // fallback to file
  }
  const logs = readJsonFile<IAuditLog>("audit_logs.json", []);
  const newLog: IAuditLog = {
    _id: "aud-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
    ...log,
    timestamp,
  };
  logs.unshift(newLog);
  writeJsonFile("audit_logs.json", logs.slice(0, 500)); // retain last 500
}

export async function getAuditLogs(): Promise<IAuditLog[]> {
  try {
    if (await connectToDatabase()) {
      const docs = await AuditLog.find().sort({ timestamp: -1 }).limit(100).lean();
      return JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {
    // fallback
  }
  return readJsonFile<IAuditLog>("audit_logs.json", []);
}

/* ==================== USERS ==================== */
export async function getUsers(): Promise<IUser[]> {
  try {
    if (await connectToDatabase()) {
      const docs = await User.find().sort({ createdAt: -1 }).lean();
      if (docs.length > 0) return JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}
  return readJsonFile<IUser>("users.json", getInitialUsers());
}

export async function getUserByEmail(email: string): Promise<IUser | null> {
  const users = await getUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function saveUser(userData: Partial<IUser> & { email: string }): Promise<IUser> {
  const users = readJsonFile<IUser>("users.json", getInitialUsers());
  const now = new Date().toISOString();

  if (userData._id) {
    const idx = users.findIndex((u) => u._id === userData._id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...userData, updatedAt: now };
      writeJsonFile("users.json", users);
      return users[idx];
    }
  }

  const newUser: IUser = {
    _id: "u-" + Date.now(),
    name: userData.name || "User",
    email: userData.email,
    passwordHash: userData.passwordHash || "",
    role: userData.role || "staff",
    status: userData.status || "active",
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  writeJsonFile("users.json", users);

  try {
    if (await connectToDatabase()) {
      await User.findOneAndUpdate(
        { email: newUser.email },
        { ...newUser },
        { upsert: true, new: true }
      );
    }
  } catch (e) {}

  return newUser;
}

export async function deleteUser(id: string): Promise<boolean> {
  const users = readJsonFile<IUser>("users.json", getInitialUsers());
  const filtered = users.filter((u) => u._id !== id);
  writeJsonFile("users.json", filtered);
  try {
    if (await connectToDatabase()) {
      await User.findByIdAndDelete(id);
    }
  } catch (e) {}
  return true;
}

/* ==================== COURIERS ==================== */
export async function getCouriers(): Promise<ICourier[]> {
  const cached = objectCache.getCouriers();
  if (cached && cached.length > 0) return cached;

  let couriers: ICourier[] = [];
  try {
    if (await connectToDatabase()) {
      const docs = await Courier.find().sort({ name: 1 }).lean();
      if (docs.length > 0) couriers = JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}

  if (couriers.length === 0) {
    couriers = readJsonFile<ICourier>("couriers.json", getInitialCouriers());
  }

  objectCache.setCouriers(couriers);
  return couriers;
}

export async function getCourierById(id: string): Promise<ICourier | null> {
  const cached = objectCache.getCourierById(id);
  if (cached) return cached;
  const couriers = await getCouriers();
  return couriers.find((c) => c._id === id || c.name === id) || null;
}

export async function saveCourier(courierData: Partial<ICourier>): Promise<ICourier> {
  const couriers = readJsonFile<ICourier>("couriers.json", getInitialCouriers());
  const now = new Date().toISOString();

  let savedCourier: ICourier;

  if (courierData._id) {
    const idx = couriers.findIndex((c) => c._id === courierData._id);
    if (idx !== -1) {
      couriers[idx] = { ...couriers[idx], ...courierData, updatedAt: now };
      writeJsonFile("couriers.json", couriers);

      try {
        if (await connectToDatabase()) {
          await Courier.findByIdAndUpdate(courierData._id, couriers[idx]);
        }
      } catch (e) {}
      savedCourier = couriers[idx];
    } else {
      savedCourier = courierData as ICourier;
    }
  } else {
    const newCourier: ICourier = {
      _id: "c-" + Date.now(),
      name: courierData.name || "New Courier",
      serviceArea: courierData.serviceArea || "Inside Valley",
      contactPerson: courierData.contactPerson || "",
      phone: courierData.phone || "",
      defaultDeliveryCharge: Number(courierData.defaultDeliveryCharge) || 0,
      defaultReturnCharge: Number(courierData.defaultReturnCharge) || 0,
      status: courierData.status || "active",
      notes: courierData.notes || "",
      createdAt: now,
      updatedAt: now,
    };
    couriers.push(newCourier);
    writeJsonFile("couriers.json", couriers);

    try {
      if (await connectToDatabase()) {
        await Courier.create(newCourier);
      }
    } catch (e) {}
    savedCourier = newCourier;
  }

  objectCache.setCouriers(couriers);
  cacheCrawler.triggerAsyncRecrawl(["couriers", "dashboard"]);
  return savedCourier;
}

export async function deleteCourier(id: string): Promise<{ success: boolean; message?: string }> {
  // Remove courier from store
  const couriers = readJsonFile<ICourier>("couriers.json", getInitialCouriers());
  const filtered = couriers.filter((c) => c._id !== id);
  writeJsonFile("couriers.json", filtered);
  objectCache.setCouriers(filtered);

  // Cascade cleanup any linked parcels, batches, settlements, payments, and ledger entries
  const parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  const remainingParcels = parcels.filter((p) => p.courierId !== id);
  writeJsonFile("parcels.json", remainingParcels);

  const batches = readJsonFile<IBatch>("batches.json", getInitialBatches());
  const remainingBatches = batches.filter((b) => b.courierId !== id);
  writeJsonFile("batches.json", remainingBatches);

  const settlements = readJsonFile<ISettlement>("settlements.json", getInitialSettlements());
  const remainingSettlements = settlements.filter((s) => s.courierId !== id);
  writeJsonFile("settlements.json", remainingSettlements);

  const payments = readJsonFile<IPayment>("payments.json", getInitialPayments());
  const remainingPayments = payments.filter((pay) => pay.courierId !== id);
  writeJsonFile("payments.json", remainingPayments);

  const ledger = readJsonFile<ILedgerEntry>("ledger.json", getInitialLedger());
  const remainingLedger = ledger.filter((l) => l.courierId !== id);
  writeJsonFile("ledger.json", remainingLedger);

  try {
    if (await connectToDatabase()) {
      await Courier.findByIdAndDelete(id);
      await Parcel.deleteMany({ courierId: id });
      await Batch.deleteMany({ courierId: id });
      await Settlement.deleteMany({ courierId: id });
      await Payment.deleteMany({ courierId: id });
      await LedgerEntry.deleteMany({ courierId: id });
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl([
    "couriers",
    "parcels",
    "batches",
    "settlements",
    "payments",
    "ledger",
    "dashboard",
  ]);

  return { success: true };
}

/* ==================== BATCHES ==================== */
export async function getBatches(): Promise<IBatch[]> {
  const cached = objectCache.getBatches();
  if (cached && cached.length > 0) return cached;

  let batches: IBatch[] = [];
  try {
    if (await connectToDatabase()) {
      const docs = await Batch.find().sort({ batchDate: -1, createdAt: -1 }).lean();
      if (docs.length > 0) batches = JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}

  if (batches.length === 0) {
    batches = readJsonFile<IBatch>("batches.json", getInitialBatches());
  }

  objectCache.setBatches(batches);
  return batches;
}

export async function getBatchById(id: string): Promise<IBatch | null> {
  const cached = objectCache.getBatchById(id);
  if (cached) return cached;
  const batches = await getBatches();
  return batches.find((b) => b._id === id || b.batchNumber === id) || null;
}

export async function saveBatch(batchData: Partial<IBatch>): Promise<IBatch> {
  const batches = readJsonFile<IBatch>("batches.json", getInitialBatches());
  const now = new Date().toISOString();

  let savedBatch: IBatch;

  if (batchData._id) {
    const idx = batches.findIndex((b) => b._id === batchData._id);
    if (idx !== -1) {
      batches[idx] = { ...batches[idx], ...batchData, updatedAt: now };
      writeJsonFile("batches.json", batches);
      try {
        if (await connectToDatabase()) {
          await Batch.findByIdAndUpdate(batchData._id, batches[idx]);
        }
      } catch (e) {}
      savedBatch = batches[idx];
    } else {
      savedBatch = batchData as IBatch;
    }
  } else {
    const newBatch: IBatch = {
      _id: "b-" + Date.now(),
      batchNumber: batchData.batchNumber || `BAT-${Date.now()}`,
      courierId: batchData.courierId || "",
      courierName: batchData.courierName || "",
      batchDate: batchData.batchDate || now.split("T")[0],
      totalPackages: Number(batchData.totalPackages) || 0,
      totalCOD: Number(batchData.totalCOD) || 0,
      notes: batchData.notes || "",
      createdBy: batchData.createdBy || "Staff",
      createdAt: now,
      updatedAt: now,
    };

    batches.unshift(newBatch);
    writeJsonFile("batches.json", batches);

    try {
      if (await connectToDatabase()) {
        await Batch.create(newBatch);
      }
    } catch (e) {}
    savedBatch = newBatch;
  }

  cacheCrawler.triggerAsyncRecrawl(["batches", "dashboard"]);
  return savedBatch;
}

/* ==================== PARCELS ==================== */
export async function getParcels(): Promise<IParcel[]> {
  const cached = objectCache.getParcels();
  if (cached && cached.length > 0) return cached;

  let parcels: IParcel[] = [];
  try {
    if (await connectToDatabase()) {
      const docs = await Parcel.find().sort({ createdAt: -1 }).lean();
      if (docs.length > 0) parcels = JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}

  if (parcels.length === 0) {
    parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  }

  objectCache.setParcels(parcels);
  return parcels;
}

export async function getParcelById(id: string): Promise<IParcel | null> {
  const cached = objectCache.getParcelById(id);
  if (cached) return cached;
  const parcels = await getParcels();
  return parcels.find((p) => p._id === id || p.mobile === id || (p.trackingId && p.trackingId === id)) || null;
}

/**
 * Primary Mobile-Number-Based Parcel Tracking
 * Returns all parcels associated with the customer's mobile number.
 */
export async function getParcelsByMobile(mobile: string): Promise<IParcel[]> {
  const cleanMobile = mobile.trim();
  const cached = objectCache.getParcelsByMobile(cleanMobile);
  if (cached && cached.length > 0) return cached;
  const parcels = await getParcels();
  return parcels.filter((p) => p.mobile.trim() === cleanMobile);
}

/**
 * Checks duplicate tracking ID or (Mobile + COD + Date)
 */
export async function checkDuplicates(
  items: Array<{ trackingId?: string; mobile?: string; codAmount?: number }>
): Promise<{ trackingDuplicates: string[]; suspiciousDuplicates: string[] }> {
  const existingParcels = await getParcels();
  const existingTracking = new Set(
    existingParcels.filter((p) => p.trackingId).map((p) => p.trackingId!.trim().toLowerCase())
  );
  
  const todayStr = new Date().toISOString().split("T")[0];
  const existingCombos = new Set(
    existingParcels.map(
      (p) => `${p.mobile.trim()}_${p.codAmount}_${(p.createdAt || todayStr).split("T")[0]}`
    )
  );

  const trackingDuplicates: string[] = [];
  const suspiciousDuplicates: string[] = [];

  for (const item of items) {
    if (item.trackingId && existingTracking.has(item.trackingId.trim().toLowerCase())) {
      trackingDuplicates.push(item.trackingId.trim());
    }
    if (item.mobile && item.codAmount !== undefined) {
      const combo = `${item.mobile.trim()}_${item.codAmount}_${todayStr}`;
      if (existingCombos.has(combo)) {
        suspiciousDuplicates.push(
          `Customer ${item.mobile} with COD Rs. ${item.codAmount} already exists today`
        );
      }
    }
  }

  return { trackingDuplicates, suspiciousDuplicates };
}

export async function bulkSaveParcels(
  parcelList: Array<Partial<IParcel>>
): Promise<IParcel[]> {
  const parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  const now = new Date().toISOString();
  const created: IParcel[] = [];

  for (let i = 0; i < parcelList.length; i++) {
    const p = parcelList[i];
    const newParcel: IParcel = {
      _id: "p-" + Date.now() + "-" + i,
      batchId: p.batchId || "",
      batchNumber: p.batchNumber || "",
      courierId: p.courierId || "",
      courierName: p.courierName || "",
      customerName: p.customerName || "Customer",
      mobile: p.mobile || "",
      trackingId: p.trackingId || `TRK-${Date.now()}-${i}`,
      sku: p.sku || "",
      codAmount: Number(p.codAmount) || 0,
      serviceArea: p.serviceArea || "Inside Valley",
      deliveryCharge: Number(p.deliveryCharge) || 0,
      returnCharge: Number(p.returnCharge) || 0,
      status: p.status || "Pending",
      deliveryDate: p.deliveryDate,
      returnDate: p.returnDate,
      actualDeliveryCharge: p.actualDeliveryCharge,
      actualReturnCharge: p.actualReturnCharge,
      settlementId: p.settlementId,
      settlementStatus: p.settlementStatus || "Unsettled",
      remarks: p.remarks || "",
      createdBy: p.createdBy || "Staff",
      createdAt: now,
      updatedAt: now,
    };
    created.push(newParcel);
    parcels.unshift(newParcel);
  }

  writeJsonFile("parcels.json", parcels);

  try {
    if (await connectToDatabase()) {
      await Parcel.insertMany(created);
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["parcels", "batches", "dashboard", "returns"]);
  return created;
}

export async function saveParcel(parcelData: Partial<IParcel>): Promise<IParcel> {
  const [created] = await bulkSaveParcels([parcelData]);
  return created;
}

export async function updateParcel(
  id: string,
  updates: Partial<IParcel>
): Promise<IParcel | null> {
  const parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  const idx = parcels.findIndex((p) => p._id === id);
  if (idx === -1) return null;

  const now = new Date().toISOString();
  parcels[idx] = { ...parcels[idx], ...updates, updatedAt: now };
  writeJsonFile("parcels.json", parcels);

  try {
    if (await connectToDatabase()) {
      await Parcel.findByIdAndUpdate(id, parcels[idx]);
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["parcels", "batches", "dashboard", "returns"]);
  return parcels[idx];
}

export async function bulkUpdateParcels(
  parcelIds: string[],
  updates: Partial<IParcel>
): Promise<number> {
  const parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  const now = new Date().toISOString();
  let count = 0;

  for (let i = 0; i < parcels.length; i++) {
    if (parcelIds.includes(parcels[i]._id)) {
      parcels[i] = { ...parcels[i], ...updates, updatedAt: now };
      count++;
    }
  }

  writeJsonFile("parcels.json", parcels);

  try {
    if (await connectToDatabase()) {
      await Parcel.updateMany({ _id: { $in: parcelIds } }, { $set: { ...updates, updatedAt: now } });
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["parcels", "batches", "dashboard", "returns"]);
  return count;
}

export async function deleteParcel(id: string): Promise<boolean> {
  const parcels = readJsonFile<IParcel>("parcels.json", getInitialParcels());
  const filtered = parcels.filter((p) => p._id !== id);
  writeJsonFile("parcels.json", filtered);
  try {
    if (await connectToDatabase()) {
      await Parcel.findByIdAndDelete(id);
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["parcels", "batches", "dashboard", "returns"]);
  return true;
}

/* ==================== SETTLEMENTS ==================== */
export async function getSettlements(): Promise<ISettlement[]> {
  const cached = objectCache.getSettlements();
  if (cached && cached.length > 0) return cached;

  let settlements: ISettlement[] = [];
  try {
    if (await connectToDatabase()) {
      const docs = await Settlement.find().sort({ createdAt: -1 }).lean();
      if (docs.length > 0) settlements = JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}

  if (settlements.length === 0) {
    settlements = readJsonFile<ISettlement>("settlements.json", getInitialSettlements());
  }

  objectCache.setSettlements(settlements);
  return settlements;
}

export async function getSettlementById(id: string): Promise<ISettlement | null> {
  const cached = objectCache.getSettlementById(id);
  if (cached) return cached;
  const settlements = await getSettlements();
  return (
    settlements.find((s) => s._id === id || s.settlementNumber === id) || null
  );
}

/**
 * Creates and finalizes a settlement with strict accounting calculation:
 * Gross COD = Sum of COD from delivered parcels
 * Total Charges = Delivery Charges + Return Charges
 * Current Net Receivable = Gross COD - Total Charges + Adjustments
 * Total Receivable = Current Net Receivable + Previous Due
 * Remaining Due = Total Receivable - Total Paid
 */
export async function createSettlement(data: {
  courierId: string;
  courierName: string;
  fromDate: string;
  toDate: string;
  adjustments?: number;
  adjustmentNotes?: string;
  initialPayment?: number;
  initialPaymentMethod?: string;
  initialPaymentRef?: string;
  notes?: string;
  createdBy: string;
}): Promise<ISettlement> {
  const now = new Date().toISOString();
  const settlements = readJsonFile<ISettlement>("settlements.json", getInitialSettlements());

  // 1. Fetch eligible unsettled parcels for this courier
  const allParcels = await getParcels();
  const eligibleParcels = allParcels.filter(
    (p) =>
      p.courierId === data.courierId &&
      p.settlementStatus !== "Settled" &&
      p.status !== "Cancelled"
  );

  const deliveredParcels = eligibleParcels.filter((p) => p.status === "Delivered");
  const returnedParcels = eligibleParcels.filter((p) => p.status === "Returned");

  const grossCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
  const deliveryCharges = deliveredParcels.reduce(
    (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
    0
  );
  // No return charge for returns
  const returnCharges = 0;

  const adjustments = Number(data.adjustments) || 0;
  const currentNetReceivable = grossCOD - deliveryCharges + adjustments;

  // 2. Determine previous outstanding due from previous settlements or ledger
  const courierSettlements = settlements
    .filter((s) => s.courierId === data.courierId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  let previousDue = 0;
  if (courierSettlements.length > 0) {
    previousDue = courierSettlements[0].remainingDue;
  } else {
    // Check initial ledger balance
    const ledger = await getCourierLedger(data.courierId);
    if (ledger.length > 0) {
      previousDue = ledger[ledger.length - 1].runningBalance;
    }
  }

  const totalReceivable = currentNetReceivable + previousDue;
  const initialPayment = Number(data.initialPayment) || 0;
  const totalPaid = initialPayment;
  const remainingDue = totalReceivable - totalPaid;

  const paymentStatus =
    remainingDue <= 0 ? "Paid" : totalPaid > 0 ? "Partially Paid" : "Unpaid";

  const settlementNumber = `SET-${now.split("T")[0].replace(/-/g, "")}-${String(
    settlements.length + 1
  ).padStart(3, "0")}`;

  const parcelIds = eligibleParcels.map((p) => p._id);

  const newSettlement: ISettlement = {
    _id: "s-" + Date.now(),
    settlementNumber,
    courierId: data.courierId,
    courierName: data.courierName,
    fromDate: data.fromDate,
    toDate: data.toDate,
    deliveredParcelsCount: deliveredParcels.length,
    returnedParcelsCount: returnedParcels.length,
    grossCOD,
    deliveryCharges,
    returnCharges,
    adjustments,
    adjustmentNotes: data.adjustmentNotes || "",
    currentNetReceivable,
    previousDue,
    totalReceivable,
    totalPaid,
    remainingDue,
    paymentStatus,
    parcelIds,
    notes: data.notes || "",
    createdBy: data.createdBy || "Admin",
    createdAt: now,
    updatedAt: now,
  };

  settlements.unshift(newSettlement);
  writeJsonFile("settlements.json", settlements);

  // 3. Mark all eligible parcels as settled
  await bulkUpdateParcels(parcelIds, {
    settlementId: newSettlement._id,
    settlementStatus: "Settled",
  });

  // 4. Record to Courier Ledger
  await addLedgerEntry({
    courierId: data.courierId,
    courierName: data.courierName,
    transactionDate: now.split("T")[0],
    transactionType: "Settlement Finalized",
    referenceId: settlementNumber,
    description: `Net Settlement ${settlementNumber} (COD: Rs. ${grossCOD.toLocaleString()} - Delivery Charges: Rs. ${deliveryCharges.toLocaleString()} + Adj: Rs. ${adjustments.toLocaleString()})`,
    debit: currentNetReceivable,
    credit: 0,
  });

  // 5. If initial payment provided, record payment
  if (initialPayment > 0) {
    await savePayment({
      settlementId: newSettlement._id,
      settlementNumber: newSettlement.settlementNumber,
      courierId: data.courierId,
      courierName: data.courierName,
      paymentDate: now.split("T")[0],
      amount: initialPayment,
      paymentMethod: (data.initialPaymentMethod as any) || "Bank Transfer",
      referenceNumber: data.initialPaymentRef || "",
      remarks: "Initial settlement payment",
      recordedBy: data.createdBy,
    });
  }

  try {
    if (await connectToDatabase()) {
      await Settlement.create(newSettlement);
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["settlements", "parcels", "ledger", "dashboard"]);
  return newSettlement;
}

/* ==================== PAYMENTS ==================== */
export async function getPayments(): Promise<IPayment[]> {
  const cached = objectCache.getPayments();
  if (cached && cached.length > 0) return cached;

  let payments: IPayment[] = [];
  try {
    if (await connectToDatabase()) {
      const docs = await Payment.find().sort({ paymentDate: -1, createdAt: -1 }).lean();
      if (docs.length > 0) payments = JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}

  if (payments.length === 0) {
    payments = readJsonFile<IPayment>("payments.json", getInitialPayments());
  }

  objectCache.setPayments(payments);
  return payments;
}

export async function savePayment(paymentData: Partial<IPayment>): Promise<IPayment> {
  const payments = readJsonFile<IPayment>("payments.json", getInitialPayments());
  const now = new Date().toISOString();
  const courierId = paymentData.courierId || "";
  const courier = await getCourierById(courierId);
  const courierName = paymentData.courierName || (courier ? courier.name : "Courier");
  const amount = Number(paymentData.amount) || 0;

  // Determine allocation method
  let allocationMethod: PaymentAllocationMethod = "auto_oldest";
  const reqSettlementId = (paymentData.settlementId || "").trim();

  if (paymentData.allocationMethod) {
    allocationMethod = paymentData.allocationMethod;
  } else if (reqSettlementId === "unallocated_credit") {
    allocationMethod = "unallocated_credit";
  } else if (reqSettlementId && reqSettlementId !== "auto_oldest") {
    allocationMethod = "specific_settlement";
  } else {
    allocationMethod = "auto_oldest";
  }

  const settlements = readJsonFile<ISettlement>("settlements.json", getInitialSettlements());
  const allocations: IPaymentAllocation[] = [];
  let remainingPaymentAmount = amount;
  let unallocatedAmount = 0;

  if (allocationMethod === "unallocated_credit") {
    // Method C: Keep as Unallocated Courier Credit without settlement attachment
    unallocatedAmount = amount;
    remainingPaymentAmount = 0;
  } else if (allocationMethod === "specific_settlement") {
    // Method B: Apply to a specific settlement for this courier
    const sIdx = settlements.findIndex(
      (s) => s._id === reqSettlementId && s.courierId === courierId
    );
    if (sIdx !== -1) {
      const s = settlements[sIdx];
      const allocAmount = Math.min(remainingPaymentAmount, Math.max(0, s.remainingDue));
      if (allocAmount > 0) {
        const newTotalPaid = s.totalPaid + allocAmount;
        const newRemainingDue = Math.max(0, s.totalReceivable - newTotalPaid);
        const newPaymentStatus: "Paid" | "Partially Paid" | "Unpaid" =
          newRemainingDue <= 0 ? "Paid" : newTotalPaid > 0 ? "Partially Paid" : "Unpaid";

        settlements[sIdx] = {
          ...s,
          totalPaid: newTotalPaid,
          remainingDue: newRemainingDue,
          paymentStatus: newPaymentStatus,
          updatedAt: now,
        };

        allocations.push({
          settlementId: s._id,
          settlementNumber: s.settlementNumber,
          allocatedAmount: allocAmount,
        });

        remainingPaymentAmount -= allocAmount;

        try {
          if (await connectToDatabase()) {
            await Settlement.findByIdAndUpdate(s._id, settlements[sIdx]);
          }
        } catch (e) {}
      }
    }
    // Any excess payment beyond specific settlement due is unallocated courier credit
    unallocatedAmount = remainingPaymentAmount;
    writeJsonFile("settlements.json", settlements);
  } else {
    // Method A: Auto-Apply to Oldest Settlement Due for this courier
    const courierSettlements = settlements
      .filter((s) => s.courierId === courierId && s.remainingDue > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const s of courierSettlements) {
      if (remainingPaymentAmount <= 0) break;
      const sIdx = settlements.findIndex((item) => item._id === s._id);
      if (sIdx === -1) continue;

      const toApply = Math.min(remainingPaymentAmount, s.remainingDue);
      if (toApply <= 0) continue;

      const newTotalPaid = s.totalPaid + toApply;
      const newRemainingDue = Math.max(0, s.totalReceivable - newTotalPaid);
      const newPaymentStatus: "Paid" | "Partially Paid" | "Unpaid" =
        newRemainingDue <= 0 ? "Paid" : newTotalPaid > 0 ? "Partially Paid" : "Unpaid";

      settlements[sIdx] = {
        ...s,
        totalPaid: newTotalPaid,
        remainingDue: newRemainingDue,
        paymentStatus: newPaymentStatus,
        updatedAt: now,
      };

      allocations.push({
        settlementId: s._id,
        settlementNumber: s.settlementNumber,
        allocatedAmount: toApply,
      });

      remainingPaymentAmount -= toApply;

      try {
        if (await connectToDatabase()) {
          await Settlement.findByIdAndUpdate(s._id, settlements[sIdx]);
        }
      } catch (e) {}
    }

    // Any remaining payment beyond all settlements is retained as unallocated credit
    unallocatedAmount = remainingPaymentAmount;
    writeJsonFile("settlements.json", settlements);
  }

  // Primary settlement identifiers
  let primarySettlementId = "";
  let primarySettlementNumber = "";
  if (allocations.length > 0) {
    primarySettlementId = allocations[0].settlementId;
    primarySettlementNumber = allocations.map((a) => a.settlementNumber).join(", ");
  } else if (allocationMethod === "unallocated_credit" || unallocatedAmount > 0) {
    primarySettlementNumber = "Unallocated Credit";
  }

  const newPayment: IPayment = {
    _id: "pay-" + Date.now(),
    settlementId: primarySettlementId,
    settlementNumber: primarySettlementNumber,
    allocationMethod,
    allocations,
    unallocatedAmount,
    courierId,
    courierName,
    paymentDate: paymentData.paymentDate || now.split("T")[0],
    amount,
    paymentMethod: paymentData.paymentMethod || "Bank Transfer",
    referenceNumber: paymentData.referenceNumber || "",
    remarks: paymentData.remarks || "",
    recordedBy: paymentData.recordedBy || "Admin",
    createdAt: now,
  };

  payments.unshift(newPayment);
  writeJsonFile("payments.json", payments);

  // Construct descriptive ledger entry
  let ledgerDesc = `Payment received via ${newPayment.paymentMethod} (Ref: ${
    newPayment.referenceNumber || "N/A"
  })`;
  if (allocations.length === 1) {
    ledgerDesc += ` - Applied to ${allocations[0].settlementNumber} (Rs. ${allocations[0].allocatedAmount.toLocaleString()})`;
    if (unallocatedAmount > 0) {
      ledgerDesc += ` [Excess Rs. ${unallocatedAmount.toLocaleString()} as Credit]`;
    }
  } else if (allocations.length > 1) {
    ledgerDesc += ` - Allocated across ${allocations
      .map((a) => `${a.settlementNumber} (Rs. ${a.allocatedAmount.toLocaleString()})`)
      .join(", ")}`;
    if (unallocatedAmount > 0) {
      ledgerDesc += ` [Excess Rs. ${unallocatedAmount.toLocaleString()} as Credit]`;
    }
  } else if (allocationMethod === "unallocated_credit" || unallocatedAmount > 0) {
    ledgerDesc += ` - Retained as Unallocated Courier Credit (Rs. ${amount.toLocaleString()})`;
  }

  // Record payment in Ledger (Credit: reduces courier liability to us)
  await addLedgerEntry({
    courierId: newPayment.courierId,
    courierName: newPayment.courierName,
    transactionDate: newPayment.paymentDate,
    transactionType: "Payment Received",
    referenceId: newPayment._id,
    description: ledgerDesc,
    debit: 0,
    credit: amount,
  });

  try {
    if (await connectToDatabase()) {
      await Payment.create(newPayment);
    }
  } catch (e) {}

  cacheCrawler.triggerAsyncRecrawl(["payments", "settlements", "ledger", "dashboard", "couriers"]);
  return newPayment;
}

/* ==================== LEDGER ==================== */
export async function getLedgerEntries(): Promise<ILedgerEntry[]> {
  try {
    if (await connectToDatabase()) {
      const docs = await LedgerEntry.find().sort({ transactionDate: -1, createdAt: -1 }).lean();
      if (docs.length > 0) return JSON.parse(JSON.stringify(docs));
    }
  } catch (e) {}
  return readJsonFile<ILedgerEntry>("ledger.json", getInitialLedger());
}

export async function getCourierLedger(courierId: string): Promise<ILedgerEntry[]> {
  const cached = objectCache.getCourierLedger(courierId);
  if (cached) return cached;

  const ledger = await getLedgerEntries();
  const filtered = ledger
    .filter((entry) => entry.courierId === courierId)
    .sort((a, b) => {
      const timeA = new Date(a.transactionDate).getTime();
      const timeB = new Date(b.transactionDate).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });

  let bal = 0;
  if (filtered.length > 0) {
    bal = filtered[filtered.length - 1].runningBalance;
  }
  objectCache.setCourierLedger(courierId, filtered, bal);
  return filtered;
}

export async function getCourierBalance(courierId: string): Promise<number> {
  const cachedBal = objectCache.getCourierBalance(courierId);
  if (cachedBal !== null) return cachedBal;

  const entries = await getCourierLedger(courierId);
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].runningBalance;
}

export async function addLedgerEntry(entry: {
  courierId: string;
  courierName?: string;
  transactionDate: string;
  transactionType: ILedgerEntry["transactionType"];
  referenceId?: string;
  description: string;
  debit: number;
  credit: number;
}): Promise<ILedgerEntry> {
  const ledger = readJsonFile<ILedgerEntry>("ledger.json", getInitialLedger());
  const now = new Date().toISOString();

  // Find latest running balance for this courier
  const prevBalance = await getCourierBalance(entry.courierId);

  // Running balance = Previous balance + Debit - Credit
  const newBalance = prevBalance + (entry.debit || 0) - (entry.credit || 0);

  const newEntry: ILedgerEntry = {
    _id: "led-" + Date.now(),
    courierId: entry.courierId,
    courierName: entry.courierName || "",
    transactionDate: entry.transactionDate,
    transactionType: entry.transactionType,
    referenceId: entry.referenceId || "",
    description: entry.description,
    debit: entry.debit || 0,
    credit: entry.credit || 0,
    runningBalance: newBalance,
    createdAt: now,
  };

  ledger.push(newEntry);
  writeJsonFile("ledger.json", ledger);

  try {
    if (await connectToDatabase()) {
      await LedgerEntry.create(newEntry);
    }
  } catch (e) {}

  objectCache.setCourierBalance(entry.courierId, newBalance);
  cacheCrawler.triggerAsyncRecrawl(["ledger", `ledger:${entry.courierId}`, "dashboard", "couriers"]);
  return newEntry;
}

/* ==================== SETTINGS ==================== */
const DEFAULT_COMPANY_SETTINGS: ICompanySettings = {
  companyName: "E-Commerce Garments Nepal Pvt. Ltd.",
  logoUrl: "",
  address: "New Baneshwor, Kathmandu, Nepal",
  phone: "+977-1-4789012 / 9801122334",
  email: "accounts@garmentsnepal.com",
  panVat: "609876543",
  footerMessage: "This is a computer-generated courier settlement statement. For any queries, contact accounts department within 7 business days.",
  authorizedPerson: "Santosh Mukhiya (Finance Manager)",
};

export async function getCompanySettings(): Promise<ICompanySettings> {
  const cached = objectCache.getCompanySettings();
  if (cached) return cached;

  try {
    if (await connectToDatabase()) {
      const doc = await CompanySettings.findById("company_settings").lean();
      if (doc) {
        const { _id, ...settings } = doc as any;
        objectCache.setCompanySettings(settings);
        return settings;
      }
    }
  } catch (e) {}

  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, "settings.json");
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULT_COMPANY_SETTINGS, null, 2), "utf8");
    objectCache.setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    return DEFAULT_COMPANY_SETTINGS;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    objectCache.setCompanySettings(parsed);
    return parsed;
  } catch (e) {
    objectCache.setCompanySettings(DEFAULT_COMPANY_SETTINGS);
    return DEFAULT_COMPANY_SETTINGS;
  }
}

export async function saveCompanySettings(settings: Partial<ICompanySettings>): Promise<ICompanySettings> {
  const current = await getCompanySettings();
  const updated = { ...current, ...settings };
  ensureDirectoryExists();
  const filePath = path.join(DATA_DIR, "settings.json");
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf8");

  try {
    if (await connectToDatabase()) {
      await CompanySettings.findByIdAndUpdate(
        "company_settings",
        { _id: "company_settings", ...updated },
        { upsert: true, new: true }
      );
    }
  } catch (e) {}

  objectCache.setCompanySettings(updated);
  cacheCrawler.triggerAsyncRecrawl(["settings"]);
  return updated;
}


