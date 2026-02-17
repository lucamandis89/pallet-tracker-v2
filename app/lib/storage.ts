// app/lib/storage.ts
// Universal (browser-safe) localStorage helpers + typed CRUD for Pallet Tracker.
// This file is intentionally self-contained and exports EVERYTHING referenced by pages.

export type Id = string;

const NS = "pallet-tracker-v2";

const KEYS = {
  pallets: `${NS}:pallets`,
  depots: `${NS}:depots`,
  shops: `${NS}:shops`,
  drivers: `${NS}:drivers`,
  stockMoves: `${NS}:stockMoves`,
  stockRows: `${NS}:stockRows`,
  scanHistory: `${NS}:scanHistory`,
  lastScan: `${NS}:lastScan`,
  defaultDepotId: `${NS}:defaultDepotId`,
} as const;

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function safeJsonParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  if (!hasStorage()) return [];
  return safeJsonParse<T[]>(window.localStorage.getItem(key), []);
}

function writeArray<T>(key: string, arr: T[]): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(arr));
}

function readValue<T>(key: string, fallback: T): T {
  if (!hasStorage()) return fallback;
  return safeJsonParse<T>(window.localStorage.getItem(key), fallback);
}

function writeValue<T>(key: string, value: T): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureId(id?: string): string {
  return (id && String(id)) || cryptoId();
}

function cryptoId(): string {
  // Browser-friendly random id; falls back if crypto not available.
  try {
    // @ts-ignore
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function upsertById<T extends { id: Id }>(list: T[], item: T): T[] {
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx === -1) return [item, ...list];
  const copy = list.slice();
  copy[idx] = item;
  return copy;
}

function removeById<T extends { id: Id }>(list: T[], id: Id): T[] {
  return list.filter((x) => x.id !== id);
}

/** ===== Types ===== */

export type PalletItem = {
  id: Id;
  type: string; // "EUR / EPAL", ...
  code?: string;
  status?: string;
  depotId?: Id;
  shopId?: Id;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DepotItem = {
  id: Id;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type ShopItem = {
  id: Id;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type DriverItem = {
  id: Id;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StockMove = {
  id: Id;
  // inbound/outbound, transfer, etc.
  kind: "IN" | "OUT" | "MOVE" | string;
  palletType?: string;
  qty: number;
  depotId?: Id;
  shopId?: Id;
  driverId?: Id;
  notes?: string;
  createdAt: string;
};

export type StockRow = {
  id: Id;
  palletType: string;
  depotId?: Id;
  shopId?: Id;
  qty: number;
  updatedAt: string;
};

export type ScanHistoryItem = {
  id: Id;
  // generic scan content (barcode/text)
  value: string;
  context?: string; // page/source
  createdAt: string;
};

/** ===== Last Scan ===== */

export function setLastScan(value: string | null): void {
  if (!hasStorage()) return;
  if (value === null) window.localStorage.removeItem(KEYS.lastScan);
  else window.localStorage.setItem(KEYS.lastScan, JSON.stringify(value));
}

export function getLastScan(): string | null {
  if (!hasStorage()) return null;
  return safeJsonParse<string | null>(window.localStorage.getItem(KEYS.lastScan), null);
}

/** ===== Pallets ===== */

export function getPallets(): PalletItem[] {
  return readArray<PalletItem>(KEYS.pallets);
}

export function setPallets(items: PalletItem[]): void {
  writeArray(KEYS.pallets, items);
}

export function addPallet(p: Omit<PalletItem, "id" | "createdAt" | "updatedAt"> & { id?: Id }): PalletItem {
  const list = getPallets();
  const item: PalletItem = {
    id: ensureId(p.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...p,
  };
  const next = [item, ...list];
  setPallets(next);
  return item;
}

export function updatePallet(p: Partial<PalletItem> & { id: Id }): PalletItem | null {
  const list = getPallets();
  const prev = list.find((x) => x.id === p.id);
  if (!prev) return null;
  const item: PalletItem = { ...prev, ...p, updatedAt: nowIso() };
  setPallets(upsertById(list, item));
  return item;
}

export function removePallet(id: Id): void {
  setPallets(removeById(getPallets(), id));
}

/** ===== Depots ===== */

export function getDepots(): DepotItem[] {
  return readArray<DepotItem>(KEYS.depots);
}

export function setDepots(items: DepotItem[]): void {
  writeArray(KEYS.depots, items);
}

export function addDepot(d: Omit<DepotItem, "id" | "createdAt" | "updatedAt"> & { id?: Id }): DepotItem {
  const list = getDepots();
  const item: DepotItem = {
    id: ensureId(d.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...d,
  };
  setDepots([item, ...list]);
  return item;
}

export function updateDepot(d: Partial<DepotItem> & { id: Id }): DepotItem | null {
  const list = getDepots();
  const prev = list.find((x) => x.id === d.id);
  if (!prev) return null;
  const item: DepotItem = { ...prev, ...d, updatedAt: nowIso() };
  setDepots(upsertById(list, item));
  return item;
}

export function removeDepot(id: Id): void {
  setDepots(removeById(getDepots(), id));
  // if default depot removed, clear default
  const def = getDefaultDepot();
  if (def?.id === id) setDefaultDepot(null);
}

export function getDefaultDepot(): DepotItem | null {
  const defId = readValue<string | null>(KEYS.defaultDepotId, null);
  if (!defId) return null;
  return getDepots().find((d) => d.id === defId) ?? null;
}

export function setDefaultDepot(depotId: string | null): void {
  if (!hasStorage()) return;
  if (depotId === null) window.localStorage.removeItem(KEYS.defaultDepotId);
  else window.localStorage.setItem(KEYS.defaultDepotId, JSON.stringify(depotId));
}

/** Alias some pages might import */
export const getDefaultDepotot = getDefaultDepot; // (typo safety)

/** ===== Shops ===== */

export function getShops(): ShopItem[] {
  return readArray<ShopItem>(KEYS.shops);
}

export function setShops(items: ShopItem[]): void {
  writeArray(KEYS.shops, items);
}

export function addShop(s: Omit<ShopItem, "id" | "createdAt" | "updatedAt"> & { id?: Id }): ShopItem {
  const list = getShops();
  const item: ShopItem = {
    id: ensureId(s.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...s,
  };
  setShops([item, ...list]);
  return item;
}

export function updateShop(s: Partial<ShopItem> & { id: Id }): ShopItem | null {
  const list = getShops();
  const prev = list.find((x) => x.id === s.id);
  if (!prev) return null;
  const item: ShopItem = { ...prev, ...s, updatedAt: nowIso() };
  setShops(upsertById(list, item));
  return item;
}

export function removeShop(id: Id): void {
  setShops(removeById(getShops(), id));
}

/** ===== Drivers ===== */

export function getDrivers(): DriverItem[] {
  return readArray<DriverItem>(KEYS.drivers);
}

export function setDrivers(items: DriverItem[]): void {
  writeArray(KEYS.drivers, items);
}

export function addDriver(d: Omit<DriverItem, "id" | "createdAt" | "updatedAt"> & { id?: Id }): DriverItem {
  const list = getDrivers();
  const item: DriverItem = {
    id: ensureId(d.id),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...d,
  };
  setDrivers([item, ...list]);
  return item;
}

export function updateDriver(d: Partial<DriverItem> & { id: Id }): DriverItem | null {
  const list = getDrivers();
  const prev = list.find((x) => x.id === d.id);
  if (!prev) return null;
  const item: DriverItem = { ...prev, ...d, updatedAt: nowIso() };
  setDrivers(upsertById(list, item));
  return item;
}

export function removeDriver(id: Id): void {
  setDrivers(removeById(getDrivers(), id));
}

/** Backwards-compatible alias some pages might import */
export const deleteDriver = removeDriver;

/** ===== Stock Moves / Stock ===== */

export function getStockMoves(): StockMove[] {
  return readArray<StockMove>(KEYS.stockMoves);
}

export function setStockMoves(items: StockMove[]): void {
  writeArray(KEYS.stockMoves, items);
}

export function addStockMove(m: Omit<StockMove, "id" | "createdAt"> & { id?: Id; createdAt?: string }): StockMove {
  const list = getStockMoves();
  const item: StockMove = {
    id: ensureId(m.id),
    createdAt: m.createdAt ?? nowIso(),
    ...m,
  };
  setStockMoves([item, ...list]);
  return item;
}

export function removeStockMove(id: Id): void {
  setStockMoves(removeById(getStockMoves(), id));
}

export function getStockRows(): StockRow[] {
  return readArray<StockRow>(KEYS.stockRows);
}

export function setStockRows(rows: StockRow[]): void {
  writeArray(KEYS.stockRows, rows);
}

/** ===== Scan History ===== */

export function getScanHistory(): ScanHistoryItem[] {
  return readArray<ScanHistoryItem>(KEYS.scanHistory);
}

export function setScanHistory(items: ScanHistoryItem[]): void {
  writeArray(KEYS.scanHistory, items);
}

export function addScanHistory(value: string, context?: string): ScanHistoryItem {
  const list = getScanHistory();
  const item: ScanHistoryItem = {
    id: cryptoId(),
    value,
    context,
    createdAt: nowIso(),
  };
  setScanHistory([item, ...list]);
  return item;
}

export function clearScanHistory(): void {
  setScanHistory([]);
}

/** Alias that some pages might use */
export const clearHistory = clearScanHistory;

/** ===== CSV Helpers ===== */

function escapeCsvCell(v: unknown): string {
  const s = String(v ?? "");
  // Escape " by doubling it, wrap with " if needed
  const needs = /[",\n\r;]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

function buildGenericCsv(headers: string[], rows: any[]): string {
  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(";"));
  for (const r of rows) {
    const line = headers.map((h) => escapeCsvCell(r?.[h])).join(";");
    lines.push(line);
  }
  return lines.join("\n");
}

function triggerDownload(filename: string, csv: string): void {
  if (!hasStorage()) return;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * downloadCsv supports:
 *  A) downloadCsv(items?, filename?)
 *  B) downloadCsv(filename, headers, rows)
 */
export function downloadCsv(...args: any[]): void {
  if (!hasStorage()) return;

  // Usage B
  if (typeof args[0] === "string") {
    const filename: string = args[0];
    const headers: string[] = Array.isArray(args[1]) ? args[1] : [];
    const rows: any[] = Array.isArray(args[2]) ? args[2] : [];
    triggerDownload(filename, buildGenericCsv(headers, rows));
    return;
  }

  // Usage A (legacy)
  const items: any[] = Array.isArray(args[0]) ? args[0] : [];
  const filename: string = typeof args[1] === "string" ? args[1] : "export.csv";
  const headers = items.length ? Object.keys(items[0]) : [];
  triggerDownload(filename, buildGenericCsv(headers, items));
}

/** Convenience export used by some pages */
export function downloadScanHistoryCsv(filename = "scan-history.csv"): void {
  const items = getScanHistory();
  const headers = ["id", "value", "context", "createdAt"];
  downloadCsv(filename, headers, items);
}
