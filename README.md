# Courier Management & COD Settlement System

A modern, high-speed, production-ready web application designed for e-commerce and garment enterprises in Nepal handling 100+ daily parcel dispatches across multiple courier partners.

---

## Key Features

1. **High-Speed Bulk Parcel Entry (`/new-entry`)**
   - Excel-like spreadsheet table supporting continuous data entry with keyboard navigation (`Tab`, `Enter`, Arrow keys).
   - Instant addition of +1, +10, +50, +100 rows.
   - **Direct Copy-Paste** from Excel / Google Sheets into the table.
   - **Sticky Real-Time Calculation Bar**: Live parcel counts, gross COD, estimated delivery charges, and net receivable.
   - **Duplicate Detection & Alert Modal**: Checks Tracking ID uniqueness and warns about suspicious (Customer Mobile + COD + Date) duplicates.

2. **Courier Management (`/couriers`)**
   - Dynamic partner management (Inside Valley, Outside Valley, Both).
   - Configurable default delivery and return charges.
   - Dedicated **Courier Dashboard (`/couriers/[id]`)** with 5 integrated tabs:
     - **Parcels**
     - **Batches**
     - **Settlements**
     - **Payments**
     - **Ledger**

3. **Courier COD Settlement Engine (`/settlements`)**
   - Automated accounting reconciliation:
     $$\text{Gross COD} = \sum \text{Delivered Parcels COD}$$
     $$\text{Total Charges} = \text{Delivery Charges} + \text{Return Charges}$$
     $$\text{Current Net Receivable} = \text{Gross COD} - \text{Total Charges} \pm \text{Adjustments}$$
     $$\text{Total Receivable} = \text{Current Net Receivable} + \text{Previous Due}$$
     $$\text{Remaining Due} = \text{Total Receivable} - \text{Amount Received}$$
   - Remaining dues automatically carry forward to the next settlement and ledger.
   - Creates immutable snapshot records without overwriting historical transactions.

4. **Partial Payment & Due System (`/payments`)**
   - Supports multiple partial installments against settlements or general courier dues.
   - Live settlement payment status tracking (`Unpaid`, `Partially Paid`, `Paid`).
   - Payment method support: Bank Transfer, Cash, eSewa, Khalti, etc.

5. **Double-Entry Courier Ledger (`/ledger`)**
   - Debit (COD collected) vs. Credit (Charges & Payments received).
   - Running balances with clear status banners: **Courier Owes Us** vs. **We Owe Courier**.

6. **Daily Courier Batches (`/batches`)**
   - Every dispatch generates a unique Batch ID (e.g. `BAT-20261103-001`).
   - Printable courier handover run sheet with dual signature sign-offs.

7. **Excel Import & Export (`/import-export`)**
   - Export any view, parcel list, settlement summary, or courier ledger as clean, formatted `.xlsx` files with totals.
   - Upload `.xlsx` or `.csv` files with pre-import validation highlighting invalid mobile formats or negative CODs.

8. **Nepali Currency & Locale**
   - Clean Nepali rupee formatting: `Rs. 54,400` without unnecessary `.00` decimals.
   - Mobile number validation for Nepali carriers (98/97/96 prefix).

---

## Tech Stack

- **Frontend & Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: MongoDB with Mongoose (with built-in local JSON persistence fallback for instant zero-config evaluation)
- **Icons**: Lucide React
- **Spreadsheets**: SheetJS (`xlsx`)
- **Authentication**: JWT session cookies + bcryptjs password hashing

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional)
The application includes an auto-fallback data store in `./data/`, so MongoDB is not strictly required to run immediately. To connect to a live MongoDB instance, configure `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/courier_system
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Default Login Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@courier.com` | `admin123` | Full access to all modules, users, settlements & settings |
| **Manager** | `manager@courier.com` | `manager123` | Can manage parcels, batches, couriers, settlements & payments |
| **Staff** | `staff@courier.com` | `staff123` | High-speed bulk parcel entry & status updates |

*The login page also provides 1-click demo buttons to switch roles immediately.*

