// app/lib/storage.ts
// Client-only storage helpers (localStorage) — SSR-safe (no window access on server).
// Obiettivo: mantenere EXPORTS + ALIAS per non rompere le pagine che importano nomi diversi.

export type IdName = { id: string; name: string };

export type StockLocationKind = "shop" | "depot";
export type PalletType = "EUR/EPAL" | "CHEP" | "LPR" | "IFCO" | "CP" | "ALTRO";

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type PalletStatus = "IN_STOCK" | "IN_TRANSIT" | "DELIVERED" | "MISSING";

export type PalletItem = {
  id: string; // palletId (codice)
  type?: PalletType;
  status?: PalletStatus;
  locationKind?: StockLocationKind;
  locationId?: string; // shopId/depotId
  driverId?: string;
  note?: string;
  updatedAt: number;
  createdAt: number;
};

export type HistoryAction =
  | "SCAN"
  | "REGISTER"
  | "MOVE"
  | "DELIVERED"
  | "MISSING"
  | "FOUND"
  | "NOTE"
  | "STOCK";

export type HistoryItem = {
  id: string;
  palletId: string;
  action: HistoryAction;
  note?: string;
  locationKind?: StockLocationKind;
  locationId?: string;
  driverId?: string;
  ts: number;
};

export type StockMoveDirection = "in" | "out";

export type StockMove = {
  id: string;
  ts: number; // epoch ms
  direction: StockMoveDirection;
  locationKind: StockLocationKind;
  locationId: string;
  palletType: PalletType;
  qty: number;
};

export type StockRow = {
  locationKind: StockLocationKind;
  locationId: string;
  palletType: PalletType;
  qty: number;
};

// Alcune pagine chiamano questo tipo ScanHistoryItem:
export type ScanHistoryItem = HistoryItem;

export type QrScanItem = { id: string; payload: string; ts: number };

// Alcune pagine chiamano questo tipo MissingItem / MissingItem:
export type MissingItem = {
  id: string;
  palletId: string;
  note?: string;
  createdAt: number;
  resolved?: boolean;
  resolvedAt?: number;
};

// -------------------------
// Keys
// -------------------------
const KEYS = {
  shops: "pt_shops_v1",
  depots: "pt_depots_v1",
  drivers: "pt_drivers_v1",
  pallets: "pt_pallets_v1",
  history: "pt_history_v1",
  qrScans: "pt_qr_scans_v1",
  lastScan: "pt_last_scan_v1",
  missing: "pt_missing_v1",
  stockMoves: 'pallet_tracker_stock_moves_v1',
} as const;

// -------------------------
// Safe localStorage helpers
// -------------------------
function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cryptoRandomId(): string {
  try {
    // modern browsers
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  // fallback
  return `id_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function load<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors (quota, private mode, etc.)
  }
}

function now(): number {
  return Date.now();
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

// -------------------------
// Date formatting
// -------------------------
export function formatDT(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

// -------------------------
// HISTORY (Storico)
// -------------------------
export function getHistory(): HistoryItem[] {
  return load<HistoryItem[]>(KEYS.history, []);
}

export function addHistory(e: Omit<HistoryItem, "id" | "ts"> & { ts?: number }): HistoryItem {
  const list = getHistory();
  const item: HistoryItem = {
    id: uid("hist"),
    ts: e.ts ?? now(),
    palletId: (e.palletId || "").trim(),
    action: e.action,
    note: e.note,
    locationKind: e.locationKind,
    locationId: e.locationId,
    driverId: e.driverId,
  };
  list.unshift(item);
  save(KEYS.history, list);
  return item;
}

export function clearHistory(): void {
  save<HistoryItem[]>(KEYS.history, []);
}

// Alias che alcune pagine potrebbero usare
export const getScanHistory = getHistory;
export const addScanHistory = addHistory;
export const clearScanHistory = clearHistory;

// CSV helper
function buildHistoryCsv(items: HistoryItem[]): string {
  const header = ["ts", "palletId", "action", "note", "locationKind", "locationId", "driverId"];
  const esc = (v: unknown) => `"${(v ?? "").toString().replaceAll('"', '""')}"`;
  const rows = items.slice().reverse(); // cronologico
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        esc(formatDT(r.ts)),
        esc(r.palletId),
        esc(r.action),
        esc(r.note ?? ""),
        esc(r.locationKind ?? ""),
        esc(r.locationId ?? ""),
        esc(r.driverId ?? ""),
      ].join(",")
    ),
  ];
  return lines.join("\n");
}

// ✅ downloadCsv (come prima)
export function downloadCsv(items: HistoryItem[], filename?: string): void;
export function downloadCsv(items: StockMove[], filename?: string): void;
export function downloadCsv(items: Array<HistoryItem | StockMove>, filename = "export.csv"): void {
  if (!items?.length) return;

  const first: any = items[0];

  // STOCK MOVES export
  if ("direction" in first && "locationKind" in first && "palletType" in first) {
    const headers = ["ts", "direction", "locationKind", "locationId", "palletType", "qty"];

    const rows = items.map((it: any) => [
      new Date(it.ts).toISOString(),
      it.direction,
      it.locationKind,
      it.locationId,
      it.palletType,
      String(it.qty ?? ""),
    ]);

    const csv = [headers, ...rows]
      .map((r) => r.map(csvEscape).join(","))
      .join("\n");

    downloadText(csv, filename);
    return;
  }

  // SCAN HISTORY export (default)
  const headers = ["ts", "code", "source", "lat", "lng", "accuracy"];

  const rows = items.map((it: any) => [
    new Date(it.ts).toISOString(),
    it.code ?? "",
    it.source ?? "",
    it.lat ?? "",
    it.lng ?? "",
    it.accuracy ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((r) => r.map(csvEscape).join(","))
    .join("\n");

  downloadText(csv, filename);
}

// ✅ alias richiesto da alcune pagine: historyToCsv
// Alcune pagine lo usano per scaricare il CSV: qui lo facciamo scaricare.
export function historyToCsv(items?: ScanHistoryItem[], filename = "history.csv"): void {
  downloadCsv(items as unknown as HistoryItem[] | undefined, filename);
}

// -------------------------
// SHOPS (Negozi)
// -------------------------
export function getShops(): ShopItem[] {
  return load<ShopItem[]>(KEYS.shops, []);
}

export function addShop(name: string, address?: string, note?: string): ShopItem {
  const n = (name || "").trim();
  const list = getShops();
  const item: ShopItem = {
    id: uid("shop"),
    name: n,
    address,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.shops, list);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>): ShopItem | null {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.shops, list);
  return list[idx];
}

export function deleteShop(id: string): void {
  save(KEYS.shops, getShops().filter((x) => x.id !== id));
}

// alias (se in qualche pagina importi removeShop)
export const removeShop = deleteShop;

export function getShopOptions(): { id: string; label: string }[] {
  return getShops().map((s) => ({ id: s.id, label: s.name }));
}

export function getDefaultShop(): ShopItem | null {
  const list = getShops();
  return list.length ? list[0] : null;
}

// -------------------------
// DEPOTS (Depositi)
// -------------------------
export function getDepots(): DepotItem[] {
  return load<DepotItem[]>(KEYS.depots, []);
}

export function addDepot(name: string, address?: string, note?: string): DepotItem {
  const n = (name || "").trim();
  const list = getDepots();
  const item: DepotItem = {
    id: uid("depot"),
    name: n,
    address,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.depots, list);
  return item;
}

export function updateDepot(id: string, patch: Partial<DepotItem>): DepotItem | null {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.depots, list);
  return list[idx];
}

export function deleteDepot(id: string): void {
  save(KEYS.depots, getDepots().filter((x) => x.id !== id));
}

export function getDepotOptions(): { id: string; label: string }[] {
  return getDepots().map((d) => ({ id: d.id, label: d.name }));
}

export function getDefaultDepot(): DepotItem | null {
  const list = getDepots();
  return list.length ? list[0] : null;
}

// -------------------------
// DRIVERS (Autisti)
// -------------------------
export function getDrivers(): DriverItem[] {
  return load<DriverItem[]>(KEYS.drivers, []);
}

export function addDriver(name: string, phone?: string, note?: string): DriverItem {
  const n = (name || "").trim();
  const list = getDrivers();
  const item: DriverItem = {
    id: uid("drv"),
    name: n,
    phone,
    note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  save(KEYS.drivers, list);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>): DriverItem | null {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  save(KEYS.drivers, list);
  return list[idx];
}

export function deleteDriver(id: string): void {
  save(KEYS.drivers, getDrivers().filter((x) => x.id !== id));
}

// -------------------------
// PALLETS (Pedane)
// -------------------------
export function getPallets(): PalletItem[] {
  return load<PalletItem[]>(KEYS.pallets, []);
}

export function upsertPallet(palletId: string, patch: Partial<PalletItem>): PalletItem | null {
  const id = (palletId || "").trim();
  if (!id) return null;

  const list = getPallets();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch, id, updatedAt: now() };
    save(KEYS.pallets, list);
    return list[idx];
  }

  const item: PalletItem = {
    id,
    createdAt: now(),
    updatedAt: now(),
    ...patch,
  };
  list.unshift(item);
  save(KEYS.pallets, list);
  return item;
}

export function removePallet(palletId: string): void {
  const id = (palletId || "").trim();
  save(KEYS.pallets, getPallets().filter((p) => p.id !== id));
}

// ✅ alias richiesto dagli errori: deletePallet
export const deletePallet = removePallet;

// Funzione usata dalla scan page (se presente)
export function movePalletViaScan(args: {
  palletId: string;
  locationKind?: StockLocationKind;
  locationId?: string;
  driverId?: string;
  note?: string;
  type?: PalletType;
}): PalletItem | null {
  const pid = (args.palletId || "").trim();
  if (!pid) return null;

  const updated = upsertPallet(pid, {
    type: args.type,
    status: "IN_STOCK",
    locationKind: args.locationKind,
    locationId: args.locationId,
    driverId: args.driverId,
    note: args.note,
  });

  addHistory({
    palletId: pid,
    action: "MOVE",
    note: args.note,
    locationKind: args.locationKind,
    locationId: args.locationId,
    driverId: args.driverId,
  });

  return updated;
}

// -------------------------
// SCAN (QR)
// -------------------------
export function setLastScan(value: string): void {
  save(KEYS.lastScan, (value || "").toString());
}

export function getLastScan(): string {
  return load<string>(KEYS.lastScan, "");
}

// Se la tua UI usa una lista scansioni QR:
export function getQrScans(): QrScanItem[] {
  return load<QrScanItem[]>(KEYS.qrScans, []);
}

export function addQrScan(payload: string): QrScanItem {
  const list = getQrScans();
  const item: QrScanItem = { id: uid("scan"), payload: (payload || "").toString(), ts: now() };
  list.unshift(item);
  save(KEYS.qrScans, list);
  return item;
}

export function clearQrScans(): void {
  save<QrScanItem[]>(KEYS.qrScans, []);
}

// -------------------------
// MISSING (Pedane Mancanti)
// -------------------------
export function getMissing(): MissingItem[] {
  return load<MissingItem[]>(KEYS.missing, []);
}

export function addMissing(palletId: string, note?: string): MissingItem {
  const pid = (palletId || "").trim();
  const list = getMissing();

  // evita duplicati non risolti
  const idx = list.findIndex((m) => m.palletId === pid && !m.resolved);
  if (idx >= 0) {
    const upd: MissingItem = {
      ...list[idx],
      note: note ?? list[idx].note,
      resolved: false,
      resolvedAt: undefined,
    };
    list[idx] = upd;
    save(KEYS.missing, list);
    addHistory({ palletId: pid, action: "MISSING", note: upd.note });
    upsertPallet(pid, { status: "MISSING" });
    return upd;
  }

  const item: MissingItem = {
    id: uid("missing"),
    palletId: pid,
    note,
    createdAt: now(),
    resolved: false,
  };

  list.unshift(item);
  save(KEYS.missing, list);
  addHistory({ palletId: pid, action: "MISSING", note });
  upsertPallet(pid, { status: "MISSING" });
  return item;
}

export function removeMissing(id: string): void {
  save(KEYS.missing, getMissing().filter((m) => m.id !== id));
}

export function resolveMissing(id: string): MissingItem | null {
  const list = getMissing();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;

  const it = list[idx];
  const resolved: MissingItem = { ...it, resolved: true, resolvedAt: now() };
  list[idx] = resolved;
  save(KEYS.missing, list);

  if (resolved.palletId) {
    addHistory({ palletId: resolved.palletId, action: "FOUND", note: resolved.note });
    upsertPallet(resolved.palletId, { status: "IN_STOCK" });
  }

  return resolved;
}

// Alias extra (se in qualche file hai quei nomi vecchi)
export const getMissingList = getMissing;
export const markMissing = addMissing;
export const unmarkMissing = resolveMissing;


// =========================
// Compat aliases (avoid build errors if some pages import older/newer names)
// =========================


// =======================
// STOCK (pallet movements)
// =======================

export function getStockMoves(): StockMove[] {
  const moves = load<StockMove[]>(KEYS.stockMoves, []);
  // Ensure stable sort newest-first
  return [...moves].sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0));
}

export function addStockMove(input: Omit<StockMove, "id"> & { id?: string }): StockMove {
  const move: StockMove = {
    id: input.id ?? cryptoRandomId(),
    ts: input.ts,
    direction: input.direction,
    locationKind: input.locationKind,
    locationId: input.locationId,
    palletType: input.palletType,
    qty: input.qty,
  };

  const moves = load<StockMove[]>(KEYS.stockMoves, []);
  moves.push(move);
  save(KEYS.stockMoves, moves);
  return move;
}

export function clearStockMoves(): void {
  save(KEYS.stockMoves, []);
}

/**
 * Returns current stock by location + pallet type computed from the move log.
 * "in" adds qty, "out" subtracts qty.
 */
export function getStockRows(): StockRow[] {
  const moves = load<StockMove[]>(KEYS.stockMoves, []);
  const map = new Map<string, StockRow>();

  for (const m of moves) {
    const qty = Number(m.qty ?? 0);
    if (!qty || qty < 0) continue;

    const key = `${m.locationKind}||${m.locationId}||${m.palletType}`;
    const prev = map.get(key) ?? {
      locationKind: m.locationKind,
      locationId: m.locationId,
      palletType: m.palletType,
      qty: 0,
    };

    const delta = (m.direction === "out" ? -1 : 1) * qty;
    const nextQty = (prev.qty ?? 0) + delta;

    map.set(key, { ...prev, qty: nextQty });
  }

  // Convert to array, keep only non-zero rows
  return [...map.values()]
    .filter((r) => (r.qty ?? 0) !== 0)
    .sort((a, b) => {
      const ak = `${a.locationKind}||${a.locationId}||${a.palletType}`;
      const bk = `${b.locationKind}||${b.locationId}||${b.palletType}`;
      return ak.localeCompare(bk);
    });
}
// Scan history API (some pages import these names)

// Legacy helpers (kept for backward compatibility)
export const markMissingLegacy = markMissing;
export const deleteShopLegacy = deleteShop;
export const deletePalletLegacy = deletePallet;
export const getDepotOptionsLegacy = getDepotOptions;
export const getShopOptionsLegacy = getShopOptions;

