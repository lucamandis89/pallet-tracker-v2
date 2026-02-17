// app/lib/storage.ts
// Client-only storage helpers (localStorage) — SSR-safe (no window access on server).
// ⚠️ This file is intentionally permissive (types + function overloads) to avoid TS build breaks
// when pages import older/newer helper names.

export type IdName = { id: string; name: string };

export type StockLocationKind = "shop" | "depot";
export type PalletType = "EUR/EPAL" | "CHEP" | "LPR" | "IFCO" | "CP" | "ALTRO";
export type PalletStatus = "IN_STOCK" | "IN_TRANSIT" | "DELIVERED" | "MISSING";

// Drivers in your pages currently expect address/lat/lng/notes.
export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
};

export type PalletItem = {
  id: string; // palletId
  type?: PalletType;
  status?: PalletStatus;
  locationKind?: StockLocationKind;
  locationId?: string;
  driverId?: string;
  note?: string;
  notes?: string;
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

// Some pages use these names
export type ScanHistoryItem = HistoryItem;

export type StockMoveItem = {
  id: string;
  palletId: string;
  fromKind?: StockLocationKind;
  fromId?: string;
  toKind?: StockLocationKind;
  toId?: string;
  driverId?: string;
  note?: string;
  createdAt: number;
};

export type QrScanItem = { id: string; payload: string; ts: number };

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
  shops: "pt_shops_v2",
  depots: "pt_depots_v2",
  drivers: "pt_drivers_v2",
  pallets: "pt_pallets_v2",
  history: "pt_history_v2",
  stockMoves: "pt_stock_moves_v2",
  qrScans: "pt_qr_scans_v2",
  lastScan: "pt_last_scan_v2",
  missing: "pt_missing_v2",
} as const;

// -------------------------
// Safe localStorage helpers
// -------------------------
function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
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
    // ignore
  }
}

function now(): number {
  return Date.now();
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

export function formatDT(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

// -------------------------
// HISTORY
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

// Aliases
export const getScanHistory = getHistory;
export const addScanHistory = addHistory;
export const clearScanHistory = clearHistory;

// Some pages import exactly these names
export const historyToCsv = (items?: ScanHistoryItem[], filename = "history.csv"): void => {
  downloadCsv(items as unknown as HistoryItem[] | undefined, filename);
};

// -------------------------
// LAST SCAN
// -------------------------
export type LastScan = {
  id?: string;
  payload?: string;
  text?: string;
  ts: number;
};

export function getLastScan(): LastScan | null {
  return load<LastScan | null>(KEYS.lastScan, null);
}

export function setLastScan(s: Partial<LastScan> | null): void {
  if (!s) {
    save<LastScan | null>(KEYS.lastScan, null);
    return;
  }
  const prev = getLastScan();
  const merged: LastScan = {
    ts: s.ts ?? prev?.ts ?? now(),
    id: s.id ?? prev?.id,
    payload: s.payload ?? prev?.payload,
    text: s.text ?? prev?.text,
  };
  save(KEYS.lastScan, merged);
}

// -------------------------
// PALLETS
// -------------------------
export function getPallets(): PalletItem[] {
  return load<PalletItem[]>(KEYS.pallets, []);
}

export function setPallets(list: PalletItem[]): void {
  save(KEYS.pallets, list);
}

export function upsertPallet(p: Partial<PalletItem> & { id: string }): PalletItem {
  const id = (p.id || "").trim();
  const list = getPallets();
  const i = list.findIndex((x) => x.id === id);
  const base: PalletItem =
    i >= 0
      ? list[i]
      : {
          id,
          createdAt: now(),
          updatedAt: now(),
        };

  const next: PalletItem = {
    ...base,
    ...p,
    id,
    createdAt: base.createdAt ?? now(),
    updatedAt: now(),
  };

  if (i >= 0) list[i] = next;
  else list.unshift(next);

  setPallets(list);
  return next;
}

export function deletePallet(id: string): void {
  setPallets(getPallets().filter((x) => x.id !== id));
}

export const removePallet = deletePallet;

// -------------------------
// SCANS / STOCK MOVES (very lightweight)
// -------------------------
export function getStockMoves(): StockMoveItem[] {
  return load<StockMoveItem[]>(KEYS.stockMoves, []);
}

export function setStockMoves(list: StockMoveItem[]): void {
  save(KEYS.stockMoves, list);
}

export function addStockMove(m: Omit<StockMoveItem, "id" | "createdAt"> & { createdAt?: number }): StockMoveItem {
  const list = getStockMoves();
  const item: StockMoveItem = {
    id: uid("move"),
    createdAt: m.createdAt ?? now(),
    palletId: (m.palletId || "").trim(),
    fromKind: m.fromKind,
    fromId: m.fromId,
    toKind: m.toKind,
    toId: m.toId,
    driverId: m.driverId,
    note: m.note,
  };
  list.unshift(item);
  setStockMoves(list);
  return item;
}

// Pages sometimes call this "upsertScan" (we store it as a history SCAN entry).
export function upsertScan(input: any): HistoryItem {
  // Accept anything: { palletId, payload, text, ... }
  const palletId = (input?.palletId ?? input?.id ?? "").toString();
  const note = input?.note ?? input?.text ?? input?.payload;
  const h = addHistory({ palletId, action: "SCAN", note });
  setLastScan({ ts: h.ts, id: h.palletId, payload: String(input?.payload ?? ""), text: String(note ?? "") });
  return h;
}

// -------------------------
// DRIVERS
// -------------------------
export function getDrivers(): DriverItem[] {
  return load<DriverItem[]>(KEYS.drivers, []);
}

export function setDrivers(list: DriverItem[]): void {
  save(KEYS.drivers, list);
}

// Supports both: addDriver(name, phone?) and addDriver({name, phone, address, ...})
export function addDriver(name: string, phone?: string): DriverItem;
export function addDriver(obj: Partial<DriverItem> & { name: string }): DriverItem;
export function addDriver(a: any, b?: any): DriverItem {
  const list = getDrivers();
  const isObj = typeof a === "object" && a !== null;
  const name = (isObj ? a.name : a || "").toString().trim();
  const phone = (isObj ? a.phone : b) as string | undefined;

  const item: DriverItem = {
    id: uid("drv"),
    name,
    phone,
    address: isObj ? a.address : undefined,
    lat: isObj ? a.lat : undefined,
    lng: isObj ? a.lng : undefined,
    notes: isObj ? a.notes ?? a.note : undefined,
    note: isObj ? a.note : undefined,
    createdAt: now(),
    updatedAt: now(),
  };

  list.unshift(item);
  setDrivers(list);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>): DriverItem | null {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  setDrivers(list);
  return list[idx];
}

export function deleteDriver(id: string): void {
  setDrivers(getDrivers().filter((x) => x.id !== id));
}

export const removeDriver = deleteDriver;

// -------------------------
// SHOPS
// -------------------------
export function getShops(): ShopItem[] {
  return load<ShopItem[]>(KEYS.shops, []);
}

export function setShops(list: ShopItem[]): void {
  save(KEYS.shops, list);
}

export function addShop(name: string, address?: string, note?: string): ShopItem {
  const list = getShops();
  const item: ShopItem = {
    id: uid("shop"),
    name: (name || "").trim(),
    address,
    note,
    notes: note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  setShops(list);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>): ShopItem | null {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  setShops(list);
  return list[idx];
}

export function deleteShop(id: string): void {
  setShops(getShops().filter((x) => x.id !== id));
}

export const removeShop = deleteShop;

// -------------------------
// DEPOTS
// -------------------------
export function getDepots(): DepotItem[] {
  return load<DepotItem[]>(KEYS.depots, []);
}

export function setDepots(list: DepotItem[]): void {
  save(KEYS.depots, list);
}

export function addDepot(name: string, address?: string, note?: string): DepotItem {
  const list = getDepots();
  const item: DepotItem = {
    id: uid("dep"),
    name: (name || "").trim(),
    address,
    note,
    notes: note,
    createdAt: now(),
    updatedAt: now(),
  };
  list.unshift(item);
  setDepots(list);
  return item;
}

export function updateDepot(id: string, patch: Partial<DepotItem>): DepotItem | null {
  const list = getDepots();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], ...patch, updatedAt: now() };
  setDepots(list);
  return list[idx];
}

export function deleteDepot(id: string): void {
  setDepots(getDepots().filter((x) => x.id !== id));
}

export const removeDepot = deleteDepot;

// -------------------------
// MISSING
// -------------------------
export function getMissing(): MissingItem[] {
  return load<MissingItem[]>(KEYS.missing, []);
}

export function setMissing(list: MissingItem[]): void {
  save(KEYS.missing, list);
}

export function addMissing(palletId: string, note?: string): MissingItem {
  const list = getMissing();
  const item: MissingItem = {
    id: uid("miss"),
    palletId: (palletId || "").trim(),
    note,
    createdAt: now(),
    resolved: false,
  };
  list.unshift(item);
  setMissing(list);
  return item;
}

export function resolveMissing(id: string): MissingItem | null {
  const list = getMissing();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  list[idx] = { ...list[idx], resolved: true, resolvedAt: now() };
  setMissing(list);
  return list[idx];
}

// -------------------------
// CSV DOWNLOAD
// -------------------------
function escCsv(v: unknown): string {
  return `"${(v ?? "").toString().replaceAll('"', '""')}"`;
}

function buildCsvFromRows(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.join(","), ...rows.map((r) => r.map(escCsv).join(","))];
  return lines.join("\n");
}

function triggerCsvDownload(csv: string, filename: string): void {
  if (!hasStorage()) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

// Supports two call styles used across pages:
// 1) downloadCsv(items?, filename?)  where items are HistoryItem[]
// 2) downloadCsv(filename, headers, rows)
export function downloadCsv(): void;
export function downloadCsv(items?: HistoryItem[], filename?: string): void;
export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>): void;
export function downloadCsv(a?: any, b?: any, c?: any): void {
  // style #2
  if (typeof a === "string" && Array.isArray(b) && Array.isArray(c)) {
    const filename = a;
    const headers = b as string[];
    const rows = c as Array<Array<unknown>>;
    triggerCsvDownload(buildCsvFromRows(headers, rows), filename);
    return;
  }

  // style #1
  const items = (Array.isArray(a) ? (a as HistoryItem[]) : undefined) ?? getHistory();
  const filename = (typeof b === "string" ? b : "history.csv") as string;

  const headers = ["ts", "palletId", "action", "note", "locationKind", "locationId", "driverId"];
  const rows = items
    .slice()
    .reverse()
    .map((r) => [formatDT(r.ts), r.palletId, r.action, r.note ?? "", r.locationKind ?? "", r.locationId ?? "", r.driverId ?? ""]);

  triggerCsvDownload(buildCsvFromRows(headers, rows), filename);
}



// ---- Compatibility exports (some pages expect these names) ----
// Older UI pages import getStockRows; it is the same data as getStockMoves.
export const getStockRows = getStockMoves;
// Some codebases refer to a generic StockRow type.
export type StockRow = StockMoveItem;
