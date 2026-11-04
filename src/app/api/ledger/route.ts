import { NextResponse } from "next/server";
import {
  getLedgerEntries,
  getCouriers,
  addLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  addAuditLog,
  getCourierById,
} from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { checkEditOrDeletePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const courierId = searchParams.get("courierId");

    let entries = await getLedgerEntries();
    const couriers = await getCouriers();

    if (courierId && courierId !== "all") {
      entries = entries.filter((e) => e.courierId === courierId);
    }

    // Sort by date ascending for proper ledger calculation display
    entries.sort(
      (a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime()
    );

    // Calculate totals
    const totalDebit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
    const closingBalance =
      entries.length > 0 ? entries[entries.length - 1].runningBalance : totalDebit - totalCredit;

    return NextResponse.json({
      entries,
      couriers,
      summary: {
        totalDebit,
        totalCredit,
        closingBalance,
        balanceStatus:
          closingBalance > 0
            ? "Courier Owes Us"
            : closingBalance < 0
            ? "We Owe Courier"
            : "Settled / Nil",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await request.json();
    const { courierId, transactionType, transactionDate, description, debit, credit } = body;

    if (!courierId) {
      return NextResponse.json({ error: "Courier is required" }, { status: 400 });
    }

    const courier = await getCourierById(courierId);
    const entry = await addLedgerEntry({
      courierId,
      courierName: courier?.name || "Courier",
      transactionDate: transactionDate || new Date().toISOString().split("T")[0],
      transactionType: transactionType || "Manual Adjustment",
      referenceId: body.referenceId || `ADJ-${Date.now()}`,
      description: description || "Manual adjustment",
      debit: Number(debit) || 0,
      credit: Number(credit) || 0,
    });

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "User",
      action: "ADD_LEDGER_ENTRY",
      entityType: "Ledger",
      entityId: entry._id,
      newValue: entry,
    });

    return NextResponse.json({ success: true, entry });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Edit ledger entry - Authorized for Admin and Manager only
export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const body = await request.json();
    const { _id, updates } = body;

    if (!_id) {
      return NextResponse.json({ error: "Ledger entry _id is required" }, { status: 400 });
    }

    const updated = await updateLedgerEntry(_id, updates || body);
    if (!updated) {
      return NextResponse.json({ error: "Ledger entry not found" }, { status: 404 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Manager",
      action: "UPDATE_LEDGER_ENTRY",
      entityType: "Ledger",
      entityId: _id,
      newValue: updates || body,
    });

    return NextResponse.json({ success: true, entry: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete ledger entry - Authorized for Admin and Manager only
export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    const perm = checkEditOrDeletePermission(currentUser);
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Ledger entry id is required" }, { status: 400 });
    }

    const result = await deleteLedgerEntry(id);
    if (!result.success) {
      return NextResponse.json({ error: result.message || "Failed to delete ledger entry" }, { status: 400 });
    }

    await addAuditLog({
      userId: currentUser?._id,
      userName: currentUser?.name || "Manager",
      action: "DELETE_LEDGER_ENTRY",
      entityType: "Ledger",
      entityId: id,
    });

    return NextResponse.json({ success: true, message: "Ledger entry deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

