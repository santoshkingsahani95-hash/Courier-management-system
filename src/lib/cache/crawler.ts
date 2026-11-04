/**
 * Cache Pre-Warming & Cache-Crawling Engine
 * Automatically crawls the database/file persistence, hydrates the in-memory object cache,
 * builds secondary indices, and pre-computes high-cost aggregations (dashboard, batches,
 * courier ledgers, settlements) ahead-of-time.
 */

import { objectCache } from "./objectCache";
import {
  ICourier,
  IBatch,
  IParcel,
  ISettlement,
  IPayment,
  ILedgerEntry,
  ICompanySettings,
} from "../types";
import {
  getInitialCouriers,
  getInitialBatches,
  getInitialParcels,
  getInitialSettlements,
  getInitialPayments,
  getInitialLedger,
} from "../seedData";
import { connectToDatabase } from "../db";
import Courier from "@/models/Courier";
import Batch from "@/models/Batch";
import Parcel from "@/models/Parcel";
import Settlement from "@/models/Settlement";
import Payment from "@/models/Payment";
import LedgerEntry from "@/models/LedgerEntry";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");

function readJsonFileRaw<T>(filename: string, defaultData: T[]): T[] {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return defaultData;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

export class CacheCrawler {
  private isCrawling = false;
  private crawlTimer: NodeJS.Timeout | null = null;
  private hasInitialized = false;

  /**
   * Run a full crawl and pre-warming cycle:
   * 1. Hydrates all core entities (Couriers, Batches, Parcels, Settlements, Payments, Ledger, Settings).
   * 2. Builds secondary indexes in O(1) maps.
   * 3. Pre-computes expensive aggregates (Dashboard presets, Batches summaries, Courier balances).
   */
  public async warmAll(): Promise<{ durationMs: number; stats: any }> {
    if (this.isCrawling) {
      return { durationMs: 0, stats: objectCache.getStats() };
    }

    this.isCrawling = true;
    objectCache.markCrawling();
    const startTime = Date.now();

    try {
      // Step 1: Crawl Core Entities
      const [couriers, batches, parcels, settlements, payments, settings] =
        await Promise.all([
          this.fetchCouriers(),
          this.fetchBatches(),
          this.fetchParcels(),
          this.fetchSettlements(),
          this.fetchPayments(),
          this.fetchSettings(),
        ]);

      // Hydrate into Object Cache
      objectCache.setCouriers(couriers);
      objectCache.setBatches(batches);
      objectCache.setParcels(parcels);
      objectCache.setSettlements(settlements);
      objectCache.setPayments(payments);
      if (settings) {
        objectCache.setCompanySettings(settings);
      }

      // Step 2: Crawl & Index Ledgers for all Couriers
      await this.crawlCouriersLedger(couriers);

      // Step 3: Crawl & Pre-compute High-Cost Aggregates
      await this.crawlDashboardAggregates(parcels, couriers, payments, settlements);
      await this.crawlBatchSummaries(batches, parcels);

      const durationMs = Date.now() - startTime;
      objectCache.markWarmed(durationMs);

      return {
        durationMs,
        stats: objectCache.getStats(),
      };
    } catch (error) {
      console.error("[CacheCrawler] Error during crawl & pre-warm cycle:", error);
      return { durationMs: Date.now() - startTime, stats: objectCache.getStats() };
    } finally {
      this.isCrawling = false;
    }
  }

  /* ---------------- Crawl Core Entity Fetchers ---------------- */

  private async fetchCouriers(): Promise<ICourier[]> {
    try {
      if (await connectToDatabase()) {
        const docs = await Courier.find().sort({ name: 1 }).lean();
        if (docs.length > 0) return JSON.parse(JSON.stringify(docs));
      }
    } catch (e) {}
    return readJsonFileRaw<ICourier>("couriers.json", getInitialCouriers());
  }

  private async fetchBatches(): Promise<IBatch[]> {
    try {
      if (await connectToDatabase()) {
        const docs = await Batch.find().sort({ batchDate: -1, createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(docs));
      }
    } catch (e) {}
    return readJsonFileRaw<IBatch>("batches.json", []);
  }

  private async fetchParcels(): Promise<IParcel[]> {
    try {
      if (await connectToDatabase()) {
        const docs = await Parcel.find().sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(docs));
      }
    } catch (e) {}
    return readJsonFileRaw<IParcel>("parcels.json", []);
  }

  private async fetchSettlements(): Promise<ISettlement[]> {
    try {
      if (await connectToDatabase()) {
        const docs = await Settlement.find().sort({ createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(docs));
      }
    } catch (e) {}
    return readJsonFileRaw<ISettlement>("settlements.json", []);
  }

  private async fetchPayments(): Promise<IPayment[]> {
    try {
      if (await connectToDatabase()) {
        const docs = await Payment.find().sort({ paymentDate: -1, createdAt: -1 }).lean();
        return JSON.parse(JSON.stringify(docs));
      }
    } catch (e) {}
    return readJsonFileRaw<IPayment>("payments.json", []);
  }

  private async fetchSettings(): Promise<ICompanySettings | null> {
    const list = readJsonFileRaw<ICompanySettings>("settings.json", []);
    return list.length > 0 ? list[0] : null;
  }

  /* ---------------- Secondary Crawlers ---------------- */

  private async crawlCouriersLedger(couriers: ICourier[]): Promise<void> {
    const allLedger = readJsonFileRaw<ILedgerEntry>("ledger.json", []);
    for (const c of couriers) {
      const courierEntries = allLedger
        .filter((l) => l.courierId === c._id)
        .sort((a, b) => new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime());

      let runningBalance = 0;
      if (courierEntries.length > 0) {
        runningBalance = courierEntries[courierEntries.length - 1].runningBalance;
      }
      objectCache.setCourierLedger(c._id, courierEntries, runningBalance);
    }
  }

  /**
   * Pre-calculates dashboard metrics across common preset horizons
   * so dashboard page loads respond in sub-millisecond time.
   */
  private async crawlDashboardAggregates(
    parcels: IParcel[],
    couriers: ICourier[],
    payments: IPayment[],
    settlements: ISettlement[]
  ): Promise<void> {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yesterdayStr = y.toISOString().split("T")[0];

    const p7 = new Date(now);
    p7.setDate(p7.getDate() - 6);
    const last7DaysStr = p7.toISOString().split("T")[0];

    const mFirst = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStr = mFirst.toISOString().split("T")[0];

    const presets = [
      { key: "dashboard:preset:all", fromDate: null, toDate: null },
      { key: "dashboard:preset:today", fromDate: todayStr, toDate: todayStr },
      { key: "dashboard:preset:yesterday", fromDate: yesterdayStr, toDate: yesterdayStr },
      { key: "dashboard:preset:last7days", fromDate: last7DaysStr, toDate: todayStr },
      { key: "dashboard:preset:thismonth", fromDate: thisMonthStr, toDate: todayStr },
    ];

    for (const preset of presets) {
      const summary = this.computeDashboardSummary(
        parcels,
        couriers,
        payments,
        settlements,
        preset.fromDate,
        preset.toDate
      );
      // Cache with 5 minute TTL and tag for instant invalidation
      objectCache.set(preset.key, summary, 5 * 60 * 1000, ["dashboard"]);
    }
  }

  private computeDashboardSummary(
    allParcels: IParcel[],
    couriers: ICourier[],
    allPayments: IPayment[],
    allSettlements: ISettlement[],
    fromDate: string | null,
    toDate: string | null
  ) {
    let parcels = allParcels;
    let payments = allPayments;

    if (fromDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
      payments = payments.filter((pay) => {
        const d = (pay.paymentDate || pay.createdAt || "").split("T")[0];
        return d >= fromDate;
      });
    }

    if (toDate) {
      parcels = parcels.filter((p) => {
        const d = (p.deliveryDate || p.createdAt || "").split("T")[0];
        return d <= toDate;
      });
      payments = payments.filter((pay) => {
        const d = (pay.paymentDate || pay.createdAt || "").split("T")[0];
        return d <= toDate;
      });
    }

    const totalPackages = parcels.length;
    const totalCOD = parcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

    const deliveredParcels = parcels.filter((p) => p.status === "Delivered");
    const returnedParcels = parcels.filter((p) => p.status === "Returned");
    const pendingParcels = parcels.filter((p) => p.status === "Pending");
    const cancelledParcels = parcels.filter((p) => p.status === "Cancelled");

    const deliveredCOD = deliveredParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
    const totalDeliveryCharges = deliveredParcels.reduce(
      (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
      0
    );
    const totalCharges = totalDeliveryCharges;
    const netReceivable = deliveredCOD - totalCharges;
    const amountReceived = payments.reduce((sum, pay) => sum + (pay.amount || 0), 0);

    let outstandingDue = 0;
    const courierSummaries = couriers.map((c) => {
      const cParcels = parcels.filter((p) => p.courierId === c._id);
      const cDelivered = cParcels.filter((p) => p.status === "Delivered");
      const cReturned = cParcels.filter((p) => p.status === "Returned");
      const cPending = cParcels.filter((p) => p.status === "Pending");

      const cCOD = cParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);
      const cDeliveredCOD = cDelivered.reduce((sum, p) => sum + (p.codAmount || 0), 0);
      const cDelCharges = cDelivered.reduce(
        (sum, p) => sum + (p.actualDeliveryCharge ?? p.deliveryCharge ?? 0),
        0
      );
      const cPayments = payments.filter((pay) => pay.courierId === c._id);
      const cReceived = cPayments.reduce((sum, pay) => sum + (pay.amount || 0), 0);
      const cDue = objectCache.getCourierBalance(c._id) ?? 0;
      outstandingDue += cDue;

      return {
        courierId: c._id,
        courierName: c.name,
        serviceArea: c.serviceArea,
        parcelsCount: cParcels.length,
        deliveredCount: cDelivered.length,
        returnedCount: cReturned.length,
        pendingCount: cPending.length,
        codAmount: cCOD,
        deliveredCOD: cDeliveredCOD,
        deliveryCharges: cDelCharges,
        returnCharges: 0,
        totalCharges: cDelCharges,
        netReceivable: cDeliveredCOD - cDelCharges,
        amountReceived: cReceived,
        outstandingDue: cDue,
      };
    });

    return {
      summary: {
        totalPackages,
        totalCOD,
        deliveredPackages: deliveredParcels.length,
        returnedPackages: returnedParcels.length,
        pendingPackages: pendingParcels.length,
        cancelledPackages: cancelledParcels.length,
        totalDeliveryCharges,
        totalReturnCharges: 0,
        netReceivable,
        amountReceived,
        outstandingDue,
      },
      courierSummaries,
    };
  }

  /**
   * Pre-crawls batch details and computes live parcel counts
   * so loading batch views is instant.
   */
  private async crawlBatchSummaries(batches: IBatch[], parcels: IParcel[]): Promise<void> {
    for (const b of batches) {
      const bParcels = parcels.filter((p) => p.batchId === b._id);
      const deliveredCount = bParcels.filter((p) => p.status === "Delivered").length;
      const returnedCount = bParcels.filter((p) => p.status === "Returned").length;
      const pendingCount = bParcels.filter((p) => p.status === "Pending").length;
      const totalCOD = bParcels.reduce((sum, p) => sum + (p.codAmount || 0), 0);

      const batchMeta = {
        batch: b,
        metrics: {
          totalPackages: bParcels.length,
          deliveredCount,
          returnedCount,
          pendingCount,
          totalCOD,
        },
        parcels: bParcels,
      };

      objectCache.set(`batch:detail:${b._id}`, batchMeta, 10 * 60 * 1000, ["batches"]);
    }
  }

  /* ---------------- Lifecycle & Continuous Crawling ---------------- */

  /**
   * Automatically initializes pre-warming on system startup / first request.
   */
  public init(): void {
    if (this.hasInitialized) return;
    this.hasInitialized = true;

    // Trigger immediate background pre-warming
    this.warmAll().then((res) => {
      console.log(
        `[CacheCrawler] Initial pre-warming complete in ${res.durationMs}ms. Cached: ` +
          `${res.stats.cachedEntities.parcels} parcels, ${res.stats.cachedEntities.batches} batches, ` +
          `${res.stats.cachedEntities.couriers} couriers.`
      );
    });

    // Start background crawler every 60 seconds
    this.startBackgroundCrawler(60000);
  }

  public startBackgroundCrawler(intervalMs = 60000): void {
    if (this.crawlTimer) return;
    this.crawlTimer = setInterval(() => {
      this.warmAll().catch(() => {});
    }, intervalMs);

    // Unref timer so it doesn't prevent Node process shutdown
    if (this.crawlTimer && typeof this.crawlTimer.unref === "function") {
      this.crawlTimer.unref();
    }
  }

  public stopBackgroundCrawler(): void {
    if (this.crawlTimer) {
      clearInterval(this.crawlTimer);
      this.crawlTimer = null;
    }
  }

  /**
   * Called when any mutation occurs to invalidate impacted tags
   * and immediately schedule an asynchronous background re-crawl.
   */
  public triggerAsyncRecrawl(tags: string[] = []): void {
    for (const tag of tags) {
      objectCache.invalidateTag(tag);
    }
    // Asynchronous re-warm without blocking the current mutation response
    setTimeout(() => {
      this.warmAll().catch(() => {});
    }, 50);
  }
}

// Global Singleton
declare global {
  // eslint-disable-next-line no-var
  var __cacheCrawler: CacheCrawler | undefined;
}

export const cacheCrawler: CacheCrawler =
  globalThis.__cacheCrawler || (globalThis.__cacheCrawler = new CacheCrawler());

// Auto-initialize on import
cacheCrawler.init();
