/**
 * High-Performance Database Object Cache Engine
 * Provides indexed in-memory caching for couriers, parcels, batches, settlements,
 * payments, ledgers, and aggregated query results with secondary O(1) indices.
 */

import {
  ICourier,
  IBatch,
  IParcel,
  ISettlement,
  IPayment,
  ILedgerEntry,
  ICompanySettings,
} from "../types";

export interface CacheStats {
  status: "WARMED" | "COLD" | "CRAWLING";
  totalReads: number;
  hits: number;
  misses: number;
  hitRatio: number; // percentage (0 - 100)
  totalKeys: number;
  cachedEntities: {
    couriers: number;
    batches: number;
    parcels: number;
    settlements: number;
    payments: number;
    ledgerEntries: number;
  };
  lastCrawledAt: string | null;
  lastCrawlDurationMs: number;
  memoryEstimateKb: number;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number | null; // null = persistent until invalidated
  tags: string[];
}

export class DatabaseObjectCache {
  private keyStore = new Map<string, CacheEntry<any>>();
  private tagMap = new Map<string, Set<string>>(); // tag -> Set of keys

  // High-speed secondary indexed stores
  private couriersMap = new Map<string, ICourier>();
  private batchesMap = new Map<string, IBatch>();
  private parcelsMap = new Map<string, IParcel>();
  private settlementsMap = new Map<string, ISettlement>();
  private paymentsMap = new Map<string, IPayment>();

  // Foreign key secondary indices for O(1) relationships
  private parcelsByCourier = new Map<string, Set<string>>(); // courierId -> Set of parcelIds
  private parcelsByBatch = new Map<string, Set<string>>(); // batchId -> Set of parcelIds
  private parcelsByStatus = new Map<string, Set<string>>(); // status -> Set of parcelIds
  private parcelsByMobile = new Map<string, Set<string>>(); // customer mobile -> Set of parcelIds (multi-order support)
  private parcelsByTracking = new Map<string, string>(); // legacy trackingNumber -> parcelId
  private batchesByCourier = new Map<string, Set<string>>(); // courierId -> Set of batchIds
  private settlementsByCourier = new Map<string, Set<string>>(); // courierId -> Set of settlementIds
  private paymentsByCourier = new Map<string, Set<string>>(); // courierId -> Set of paymentIds
  private ledgerByCourier = new Map<string, ILedgerEntry[]>(); // courierId -> ledger array
  private courierBalances = new Map<string, number>(); // courierId -> running balance

  private couriersHydrated = false;
  private batchesHydrated = false;
  private parcelsHydrated = false;
  private settlementsHydrated = false;
  private paymentsHydrated = false;

  private companySettings: ICompanySettings | null = null;

  // Metrics telemetry
  private totalReads = 0;
  private hits = 0;
  private misses = 0;
  private lastCrawledAt: string | null = null;
  private lastCrawlDurationMs = 0;
  private status: "WARMED" | "COLD" | "CRAWLING" = "COLD";

  constructor() {
    // initialize empty
  }

  /* ---------------- Generic Key-Value Cache with TTL & Tags ---------------- */

  public get<T>(key: string): T | null {
    this.totalReads++;
    const entry = this.keyStore.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.del(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs?: number, tags: string[] = []): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    this.keyStore.set(key, { value, expiresAt, tags });

    for (const tag of tags) {
      if (!this.tagMap.has(tag)) {
        this.tagMap.set(tag, new Set());
      }
      this.tagMap.get(tag)!.add(key);
    }
  }

  public del(key: string): void {
    const entry = this.keyStore.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        this.tagMap.get(tag)?.delete(key);
      }
      this.keyStore.delete(key);
    }
  }

  public invalidateTag(tag: string): void {
    const keys = this.tagMap.get(tag);
    if (keys) {
      keys.forEach((key) => {
        this.keyStore.delete(key);
      });
      this.tagMap.delete(tag);
    }
  }

  public invalidateAll(): void {
    this.keyStore.clear();
    this.tagMap.clear();
    this.couriersMap.clear();
    this.batchesMap.clear();
    this.parcelsMap.clear();
    this.settlementsMap.clear();
    this.paymentsMap.clear();
    this.parcelsByCourier.clear();
    this.parcelsByBatch.clear();
    this.parcelsByStatus.clear();
    this.parcelsByTracking.clear();
    this.batchesByCourier.clear();
    this.settlementsByCourier.clear();
    this.paymentsByCourier.clear();
    this.ledgerByCourier.clear();
    this.courierBalances.clear();
    this.companySettings = null;
    this.status = "COLD";
    this.couriersHydrated = false;
    this.batchesHydrated = false;
    this.parcelsHydrated = false;
    this.settlementsHydrated = false;
    this.paymentsHydrated = false;
  }

  /* ---------------- Entity-Specific Object Cache & Fast Indices ---------------- */

  // COURIERS
  public setCouriers(couriers: ICourier[]): void {
    this.couriersMap.clear();
    for (const c of couriers) {
      this.couriersMap.set(c._id, c);
    }
    this.couriersHydrated = true;
    this.invalidateTag("couriers");
    this.invalidateTag("dashboard");
  }

  public getCouriers(): ICourier[] | null {
    this.totalReads++;
    if (!this.couriersHydrated) {
      this.misses++;
      return null;
    }
    this.hits++;
    return Array.from(this.couriersMap.values());
  }

  public getCourierById(id: string): ICourier | null {
    this.totalReads++;
    const courier = this.couriersMap.get(id);
    if (courier) {
      this.hits++;
      return courier;
    }
    // Check by name as fallback
    for (const c of this.couriersMap.values()) {
      if (c.name === id) {
        this.hits++;
        return c;
      }
    }
    this.misses++;
    return null;
  }

  // BATCHES
  public setBatches(batches: IBatch[]): void {
    this.batchesMap.clear();
    this.batchesByCourier.clear();
    for (const b of batches) {
      this.batchesMap.set(b._id, b);
      if (b.courierId) {
        if (!this.batchesByCourier.has(b.courierId)) {
          this.batchesByCourier.set(b.courierId, new Set());
        }
        this.batchesByCourier.get(b.courierId)!.add(b._id);
      }
    }
    this.batchesHydrated = true;
    this.invalidateTag("batches");
    this.invalidateTag("dashboard");
  }

  public getBatches(): IBatch[] | null {
    this.totalReads++;
    if (!this.batchesHydrated) {
      this.misses++;
      return null;
    }
    this.hits++;
    return Array.from(this.batchesMap.values()).sort(
      (a, b) => new Date(b.batchDate || b.createdAt).getTime() - new Date(a.batchDate || a.createdAt).getTime()
    );
  }

  public getBatchById(id: string): IBatch | null {
    this.totalReads++;
    const b = this.batchesMap.get(id);
    if (b) {
      this.hits++;
      return b;
    }
    this.misses++;
    return null;
  }

  // PARCELS & SECONDARY INDICES
  public setParcels(parcels: IParcel[]): void {
    this.parcelsMap.clear();
    this.parcelsByCourier.clear();
    this.parcelsByBatch.clear();
    this.parcelsByStatus.clear();
    this.parcelsByMobile.clear();
    this.parcelsByTracking.clear();

    for (const p of parcels) {
      this.indexParcel(p);
    }

    this.parcelsHydrated = true;
    this.invalidateTag("parcels");
    this.invalidateTag("batches");
    this.invalidateTag("dashboard");
    this.invalidateTag("returns");
  }

  private indexParcel(p: IParcel): void {
    this.parcelsMap.set(p._id, p);

    // Index by Courier
    if (p.courierId) {
      if (!this.parcelsByCourier.has(p.courierId)) {
        this.parcelsByCourier.set(p.courierId, new Set());
      }
      this.parcelsByCourier.get(p.courierId)!.add(p._id);
    }

    // Index by Batch
    if (p.batchId) {
      if (!this.parcelsByBatch.has(p.batchId)) {
        this.parcelsByBatch.set(p.batchId, new Set());
      }
      this.parcelsByBatch.get(p.batchId)!.add(p._id);
    }

    // Index by Status
    if (p.status) {
      if (!this.parcelsByStatus.has(p.status)) {
        this.parcelsByStatus.set(p.status, new Set());
      }
      this.parcelsByStatus.get(p.status)!.add(p._id);
    }

    // Primary Tracking Index: by Customer Mobile Number (supports multiple orders per customer)
    if (p.mobile) {
      const mob = p.mobile.trim();
      if (!this.parcelsByMobile.has(mob)) {
        this.parcelsByMobile.set(mob, new Set());
      }
      this.parcelsByMobile.get(mob)!.add(p._id);
    }

    // Backward-compatible Index: by Legacy Tracking Number
    if (p.trackingId) {
      this.parcelsByTracking.set(p.trackingId.trim().toUpperCase(), p._id);
    }
  }

  public getParcels(): IParcel[] | null {
    this.totalReads++;
    if (!this.parcelsHydrated) {
      this.misses++;
      return null;
    }
    this.hits++;
    return Array.from(this.parcelsMap.values());
  }

  public getParcelById(id: string): IParcel | null {
    this.totalReads++;
    const p = this.parcelsMap.get(id);
    if (p) {
      this.hits++;
      return p;
    }
    this.misses++;
    return null;
  }

  /**
   * Primary Tracking Look-up by Customer Mobile Number
   * Returns all parcels/orders associated with the given mobile number.
   */
  public getParcelsByMobile(mobile: string): IParcel[] {
    this.totalReads++;
    const cleanMobile = mobile.trim();
    const ids = this.parcelsByMobile.get(cleanMobile);
    if (!ids || ids.size === 0) {
      this.misses++;
      return [];
    }
    this.hits++;
    const result: IParcel[] = [];
    ids.forEach((id) => {
      const p = this.parcelsMap.get(id);
      if (p) result.push(p);
    });
    return result;
  }

  public getParcelsByBatch(batchId: string): IParcel[] | null {
    this.totalReads++;
    const ids = this.parcelsByBatch.get(batchId);
    if (!ids) {
      if (this.parcelsMap.size === 0) {
        this.misses++;
        return null;
      }
      this.hits++;
      return [];
    }
    this.hits++;
    const result: IParcel[] = [];
    ids.forEach((id) => {
      const p = this.parcelsMap.get(id);
      if (p) result.push(p);
    });
    return result;
  }

  public getParcelsByCourier(courierId: string): IParcel[] | null {
    this.totalReads++;
    const ids = this.parcelsByCourier.get(courierId);
    if (!ids) {
      if (this.parcelsMap.size === 0) {
        this.misses++;
        return null;
      }
      this.hits++;
      return [];
    }
    this.hits++;
    const result: IParcel[] = [];
    ids.forEach((id) => {
      const p = this.parcelsMap.get(id);
      if (p) result.push(p);
    });
    return result;
  }

  public getParcelsByStatus(status: string): IParcel[] | null {
    this.totalReads++;
    const ids = this.parcelsByStatus.get(status);
    if (!ids) {
      if (this.parcelsMap.size === 0) {
        this.misses++;
        return null;
      }
      this.hits++;
      return [];
    }
    this.hits++;
    const result: IParcel[] = [];
    ids.forEach((id) => {
      const p = this.parcelsMap.get(id);
      if (p) result.push(p);
    });
    return result;
  }

  public findParcelByTrackingOrPhone(query: string): IParcel | null {
    this.totalReads++;
    const q = query.trim().toUpperCase();
    const id = this.parcelsByTracking.get(q);
    if (id) {
      const p = this.parcelsMap.get(id);
      if (p) {
        this.hits++;
        return p;
      }
    }

    // Search by mobile or customer name
    for (const p of this.parcelsMap.values()) {
      if (
        (p.mobile && p.mobile.includes(query)) ||
        (p.sku && p.sku.toUpperCase() === q) ||
        (p.customerName && p.customerName.toLowerCase().includes(query.toLowerCase()))
      ) {
        this.hits++;
        return p;
      }
    }

    this.misses++;
    return null;
  }

  // SETTLEMENTS
  public setSettlements(settlements: ISettlement[]): void {
    this.settlementsMap.clear();
    this.settlementsByCourier.clear();
    for (const s of settlements) {
      this.settlementsMap.set(s._id, s);
      if (s.courierId) {
        if (!this.settlementsByCourier.has(s.courierId)) {
          this.settlementsByCourier.set(s.courierId, new Set());
        }
        this.settlementsByCourier.get(s.courierId)!.add(s._id);
      }
    }
    this.settlementsHydrated = true;
    this.invalidateTag("settlements");
    this.invalidateTag("dashboard");
  }

  public getSettlements(): ISettlement[] | null {
    this.totalReads++;
    if (!this.settlementsHydrated) {
      this.misses++;
      return null;
    }
    this.hits++;
    return Array.from(this.settlementsMap.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getSettlementById(id: string): ISettlement | null {
    this.totalReads++;
    const s = this.settlementsMap.get(id);
    if (s) {
      this.hits++;
      return s;
    }
    this.misses++;
    return null;
  }

  // PAYMENTS
  public setPayments(payments: IPayment[]): void {
    this.paymentsMap.clear();
    this.paymentsByCourier.clear();
    for (const p of payments) {
      this.paymentsMap.set(p._id, p);
      if (p.courierId) {
        if (!this.paymentsByCourier.has(p.courierId)) {
          this.paymentsByCourier.set(p.courierId, new Set());
        }
        this.paymentsByCourier.get(p.courierId)!.add(p._id);
      }
    }
    this.paymentsHydrated = true;
    this.invalidateTag("payments");
    this.invalidateTag("dashboard");
  }

  public getPayments(): IPayment[] | null {
    this.totalReads++;
    if (!this.paymentsHydrated) {
      this.misses++;
      return null;
    }
    this.hits++;
    return Array.from(this.paymentsMap.values()).sort(
      (a, b) => new Date(b.paymentDate || b.createdAt).getTime() - new Date(a.paymentDate || a.createdAt).getTime()
    );
  }

  // LEDGER & BALANCES
  public setCourierLedger(courierId: string, entries: ILedgerEntry[], balance?: number): void {
    this.ledgerByCourier.set(courierId, entries);
    if (balance !== undefined) {
      this.courierBalances.set(courierId, balance);
    } else if (entries.length > 0) {
      this.courierBalances.set(courierId, entries[entries.length - 1].runningBalance || 0);
    } else {
      this.courierBalances.set(courierId, 0);
    }
    this.invalidateTag("ledger");
    this.invalidateTag(`ledger:${courierId}`);
  }

  public getCourierLedger(courierId: string): ILedgerEntry[] | null {
    this.totalReads++;
    const ledger = this.ledgerByCourier.get(courierId);
    if (ledger) {
      this.hits++;
      return ledger;
    }
    this.misses++;
    return null;
  }

  public getCourierBalance(courierId: string): number | null {
    this.totalReads++;
    if (this.courierBalances.has(courierId)) {
      this.hits++;
      return this.courierBalances.get(courierId)!;
    }
    this.misses++;
    return null;
  }

  public setCourierBalance(courierId: string, balance: number): void {
    this.courierBalances.set(courierId, balance);
    this.invalidateTag("ledger");
    this.invalidateTag(`ledger:${courierId}`);
    this.invalidateTag("dashboard");
    this.invalidateTag("couriers");
  }

  // SETTINGS
  public setCompanySettings(settings: ICompanySettings): void {
    this.companySettings = settings;
    this.set("company_settings", settings, undefined, ["settings"]);
  }

  public getCompanySettings(): ICompanySettings | null {
    this.totalReads++;
    if (this.companySettings) {
      this.hits++;
      return this.companySettings;
    }
    const fromKv = this.get<ICompanySettings>("company_settings");
    if (fromKv) {
      this.companySettings = fromKv;
      return fromKv;
    }
    this.misses++;
    return null;
  }

  /* ---------------- Crawl Lifecycle & Telemetry ---------------- */

  public markCrawling(): void {
    this.status = "CRAWLING";
  }

  public markWarmed(durationMs: number): void {
    this.status = "WARMED";
    this.lastCrawledAt = new Date().toISOString();
    this.lastCrawlDurationMs = durationMs;
  }

  public getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRatio = totalRequests > 0 ? Number(((this.hits / totalRequests) * 100).toFixed(2)) : 0;

    // Approximate memory footprint estimation
    const approxBytes =
      this.parcelsMap.size * 320 +
      this.batchesMap.size * 220 +
      this.couriersMap.size * 180 +
      this.settlementsMap.size * 280 +
      this.paymentsMap.size * 160 +
      this.keyStore.size * 240;

    return {
      status: this.status,
      totalReads: this.totalReads,
      hits: this.hits,
      misses: this.misses,
      hitRatio,
      totalKeys: this.keyStore.size,
      cachedEntities: {
        couriers: this.couriersMap.size,
        batches: this.batchesMap.size,
        parcels: this.parcelsMap.size,
        settlements: this.settlementsMap.size,
        payments: this.paymentsMap.size,
        ledgerEntries: Array.from(this.ledgerByCourier.values()).reduce((sum, l) => sum + l.length, 0),
      },
      lastCrawledAt: this.lastCrawledAt,
      lastCrawlDurationMs: this.lastCrawlDurationMs,
      memoryEstimateKb: Math.round(approxBytes / 1024),
    };
  }
}

// Global Singleton to guarantee persistence across Next.js API route invocations
declare global {
  // eslint-disable-next-line no-var
  var __dbObjectCache: DatabaseObjectCache | undefined;
}

export const objectCache: DatabaseObjectCache =
  globalThis.__dbObjectCache || (globalThis.__dbObjectCache = new DatabaseObjectCache());
