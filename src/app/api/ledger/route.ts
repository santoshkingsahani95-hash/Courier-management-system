import { NextResponse } from "next/server";
import { getLedgerEntries, getCouriers } from "@/lib/store";

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

