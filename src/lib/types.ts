export type UserRole = "admin" | "manager" | "staff";
export type UserStatus = "active" | "inactive";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export type ServiceArea = "Inside Valley" | "Outside Valley" | "Both";
export type CourierStatus = "active" | "inactive";

export interface ICourier {
  _id: string;
  name: string;
  serviceArea: ServiceArea;
  contactPerson: string;
  phone: string;
  defaultDeliveryCharge: number;
  defaultReturnCharge: number;
  status: CourierStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBatch {
  _id: string;
  batchNumber: string;
  courierId: string;
  courierName?: string;
  batchDate: string;
  totalPackages: number;
  totalCOD: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type ParcelStatus = "Pending" | "Delivered" | "Returned" | "Cancelled";
export type SettlementStatus = "Unsettled" | "Settled";

export interface IParcel {
  _id: string;
  batchId?: string;
  batchNumber?: string;
  courierId: string;
  courierName?: string;
  customerName: string;
  mobile: string; // Primary tracking & search reference
  trackingId?: string; // Optional legacy reference (Mobile number is primary)
  sku?: string;
  codAmount: number;
  serviceArea: "Inside Valley" | "Outside Valley";
  deliveryCharge: number;
  returnCharge: number;
  status: ParcelStatus;
  deliveryDate?: string;
  returnDate?: string;
  actualDeliveryCharge?: number;
  actualReturnCharge?: number;
  settlementId?: string;
  settlementStatus: SettlementStatus;
  remarks?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type SettlementPaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

export interface ISettlement {
  _id: string;
  settlementNumber: string;
  courierId: string;
  courierName?: string;
  fromDate: string;
  toDate: string;
  deliveredParcelsCount: number;
  returnedParcelsCount: number;
  grossCOD: number;
  deliveryCharges: number;
  returnCharges: number;
  adjustments: number;
  adjustmentNotes?: string;
  currentNetReceivable: number;
  previousDue: number;
  totalReceivable: number;
  totalPaid: number;
  remainingDue: number;
  paymentStatus: SettlementPaymentStatus;
  parcelIds: string[];
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod =
  | "Cash"
  | "Bank Transfer"
  | "eSewa"
  | "Khalti"
  | "Cheque Deposit"
  | "ConnectIPS"
  | "Other"
  | string;

export interface IPaymentAllocation {
  settlementId: string;
  settlementNumber: string;
  allocatedAmount: number;
}

export type PaymentAllocationMethod =
  | "auto_oldest"
  | "specific_settlement"
  | "unallocated_credit";

export interface IPayment {
  _id: string;
  settlementId?: string;
  settlementNumber?: string;
  courierId: string;
  courierName?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string;
  remarks?: string;
  allocationMethod?: PaymentAllocationMethod;
  allocations?: IPaymentAllocation[];
  unallocatedAmount?: number;
  recordedBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type LedgerTransactionType =
  | "Opening Balance"
  | "COD Receivable"
  | "Delivery Charge"
  | "Return Charge"
  | "Adjustment"
  | "Payment Received"
  | "Settlement Finalized"
  | "Settlement Due";

export interface ILedgerEntry {
  _id: string;
  courierId: string;
  courierName?: string;
  transactionDate: string;
  transactionType: LedgerTransactionType;
  referenceId?: string;
  description: string;
  debit: number; // Courier owes us more (e.g. COD collected)
  credit: number; // Courier paid or charged us (e.g. Delivery charge, Payment received)
  runningBalance: number; // Positive = Courier Owes Us, Negative = We Owe Courier
  createdAt: string;
}

export interface IAuditLog {
  _id: string;
  userId?: string;
  userName?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
}

export interface ICompanySettings {
  companyName: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email: string;
  panVat?: string;
  footerMessage: string;
  authorizedPerson: string;
}


