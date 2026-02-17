"use client";

/* ============================
   TIPI
============================ */

export type StockLocationKind = "DEPOSITO" | "NEGOZIO" | "AUTISTA";

export type ScanEvent = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source: "qr" | "manual";

  // nuovo: dove l’ho dichiarata dopo scansione (facoltativo)
  declaredKind?: StockLocationKind;
  declaredId?: string;
  palletType?: string;
  qty?: number;
};

export type PalletItem = {
  id: string;
  code: string;
  altCode?: string;
  type?: string;
  notes?: string;

  lastSeenTs?: number;
  lastLat?: number;
  lastLng?: number;
  lastSource?: "qr" | "manual";

  // nuovo: ultima posizione “logistica” dichiarata
  lastLocKind?: StockLocationKind;
  lastLocId?: string;
};

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

export type ShopItem = {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

export type DepotItem = {
  id: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

export type StockRow = {
  locationKind: StockLocationKind;
  locationId: string;
  palletType: string;
  qty: number;
};

export type StockMove = {
  id: string;
  ts: number;
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

/* ============================
   KEYS
============================ */

const KEY_HISTORY = "pt_history_v1";
const KEY_PALLETS = "pt_pallets_v1";
const KEY_LASTSCAN = "pt_lastscan_v1";
const KEY_DRIVERS = "pt_drivers_v1";
const KEY_SHOPS = "pt_shops_v1";
const KEY_DEPOTS = "pt_depots_v1";
const KEY_STOCK = "pt_stock_v1";
const KEY_STOCK_MOVES = "pt_stock_moves_v1";

/* ============================
   UTILS
============================ */

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function csvEscape(v: any): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCsv(filename: string, headers: string[], rows: any[][]) {
  const csv =
    [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))].join("\n") + "\n";

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ============================
   HISTORY
============================ */

export function getHistory(): ScanEvent[] {
  if (typeof window === "undefined") return [];
  return safeParse<ScanEvent[]>(localStorage.getItem(KEY_HISTORY), []);
}

export function setHistory(items: ScanEvent[]) {
  localStorage.setItem(KEY_HISTORY, JSON.stringify(items));
}

export function addHistory(ev: Omit<ScanEvent, "id">) {
  const items = getHistory();
  items.unshift({ id: uid("scan"), ...ev });
  setHistory(items.slice(0, 2000));
}

export function setLastScan(code: string) {
  localStorage.setItem(KEY_LASTSCAN, code);
}

export function getLastScan(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_LASTSCAN) || "";
}

/* ============================
   PALLETS
============================ */

export function getPallets(): PalletItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<PalletItem[]>(localStorage.getItem(KEY_PALLETS), []);
}

export function setPallets(items: PalletItem[]) {
  localStorage.setItem(KEY_PALLETS, JSON.stringify(items));
}

export function findPalletByCode(code: string): PalletItem | null {
  const c = (code || "").trim().toLowerCase();
  if (!c) return null;
  const items = getPallets();
  return (
    items.find((p) => p.code.toLowerCase() === c || (p.altCode || "").toLowerCase() === c) || null
  );
}

export function upsertPallet(update: Partial<PalletItem> & { code: string }) {
  const items = getPallets();
  const codeNorm = (update.code || "").trim();
  if (!codeNorm) return;

  const idx = items.findIndex(
    (p) =>
      p.code.toLowerCase() === codeNorm.toLowerCase() ||
      (p.altCode || "").toLowerCase() === codeNorm.toLowerCase()
  );

  if (idx >= 0) {
    items[idx] = { ...items[idx], ...update, code: items[idx].code || codeNorm };
  } else {
    items.unshift({
      id: uid("pallet"),
      code: codeNorm,
      altCode: update.altCode,
      type: update.type,
      notes: update.notes,
      lastSeenTs: update.lastSeenTs,
      lastLat: update.lastLat,
      lastLng: update.lastLng,
      lastSource: update.lastSource,
      lastLocKind: update.lastLocKind,
      lastLocId: update.lastLocId,
    });
  }

  setPallets(items);
}

/* ============================
   DRIVERS max 10
============================ */

export function getDrivers(): DriverItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<DriverItem[]>(localStorage.getItem(KEY_DRIVERS), []);
}

export function setDrivers(items: DriverItem[]) {
  localStorage.setItem(KEY_DRIVERS, JSON.stringify(items));
}

export function addDriver(data: Omit<DriverItem, "id" | "createdAt">) {
  const list = getDrivers();
  if (list.length >= 10) throw new Error("LIMIT_10");

  const item: DriverItem = { id: uid("drv"), createdAt: Date.now(), ...data };
  list.unshift(item);
  setDrivers(list);
  return item;
}

export function updateDriver(id: string, patch: Partial<DriverItem>) {
  const list = getDrivers();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  setDrivers(list);
}

export function removeDriver(id: string) {
  setDrivers(getDrivers().filter((x) => x.id !== id));
}

/* ============================
   SHOPS max 100
============================ */

export function getShops(): ShopItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<ShopItem[]>(localStorage.getItem(KEY_SHOPS), []);
}

export function setShops(items: ShopItem[]) {
  localStorage.setItem(KEY_SHOPS, JSON.stringify(items));
}

export function addShop(data: Omit<ShopItem, "id" | "createdAt">) {
  const list = getShops();
  if (list.length >= 100) throw new Error("LIMIT_100");

  const item: ShopItem = { id: uid("shop"), createdAt: Date.now(), ...data };
  list.unshift(item);
  setShops(list);
  return item;
}

export function updateShop(id: string, patch: Partial<ShopItem>) {
  const list = getShops();
  const idx = list.findIndex((x) => x.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], ...patch };
  setShops(list);
}

export function removeShop(id: string) {
  setShops(getShops().filter((x) => x.id !== id));
}

/* ============================
   DEPOTS (default always)
============================ */

const DEFAULT_DEPOT_ID = "dep_default";

export function getDepots(): DepotItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<DepotItem[]>(localStorage.getItem(KEY_DEPOTS), []);
}

export function setDepots(items: DepotItem[]) {
  localStorage.setItem(KEY_DEPOTS, JSON.stringify(items));
}

export function getDefaultDepot(): DepotItem {
  return { id: DEFAULT_DEPOT_ID, name: "Deposito Principale", createdAt: 0 };
}

export function getDepotOptions(): DepotItem[] {
  return [getDefaultDepot(), ...getDepots()];
}

/* ============================
   STOCK
============================ */

function stockKey(kind: StockLocationKind, id: string, palletType: string) {
  return `${kind}::${id}::${palletType}`;
}

export function getStockRows(): StockRow[] {
  if (typeof window === "undefined") return [];
  return safeParse<StockRow[]>(localStorage.getItem(KEY_STOCK), []);
}

export function setStockRows(rows: StockRow[]) {
  localStorage.setItem(KEY_STOCK, JSON.stringify(rows));
}

export function getStockMoves(): StockMove[] {
  if (typeof window === "undefined") return [];
  return safeParse<StockMove[]>(localStorage.getItem(KEY_STOCK_MOVES), []);
}

export function setStockMoves(moves: StockMove[]) {
  localStorage.setItem(KEY_STOCK_MOVES, JSON.stringify(moves));
}

export function applyStockDelta(kind: StockLocationKind, id: string, palletType: string, delta: number) {
  const rows = getStockRows();
  const k = stockKey(kind, id, palletType);

  const idx = rows.findIndex((r) => stockKey(r.locationKind, r.locationId, r.palletType) === k);
  if (idx >= 0) rows[idx] = { ...rows[idx], qty: (rows[idx].qty ?? 0) + delta };
  else rows.push({ locationKind: kind, locationId: id, palletType, qty: delta });

  setStockRows(rows);
}

export function addStockMove(input: Omit<StockMove, "id" | "ts"> & { ts?: number }) {
  const ts = input.ts ?? Date.now();
  const m: StockMove = { id: uid("stk"), ts, ...input };

  if (!m.palletType?.trim()) throw new Error("PALLET_TYPE_REQUIRED");
  if (!Number.isFinite(m.qty) || m.qty <= 0) throw new Error("QTY_INVALID");
  if (!m.from?.kind || !m.from.id) throw new Error("FROM_INVALID");
  if (!m.to?.kind || !m.to.id) throw new Error("TO_INVALID");

  applyStockDelta(m.from.kind, m.from.id, m.palletType, -m.qty);
  applyStockDelta(m.to.kind, m.to.id, m.palletType, +m.qty);

  const moves = getStockMoves();
  moves.unshift(m);
  setStockMoves(moves.slice(0, 5000));
  return m;
}

/* ============================
   HELPERS: Scan -> Stock
============================ */

// Se la pedana non ha lastLoc, considero che parta dal Deposito Principale
export function getLastKnownLocForPallet(code: string): { kind: StockLocationKind; id: string } {
  const p = findPalletByCode(code);
  if (p?.lastLocKind && p?.lastLocId) return { kind: p.lastLocKind, id: p.lastLocId };
  return { kind: "DEPOSITO", id: DEFAULT_DEPOT_ID };
}

// Aggiorna posizione pedana + crea movimento stock
export function movePalletViaScan(params: {
  code: string;
  palletType: string;
  qty: number;
  toKind: StockLocationKind;
  toId: string;
  note?: string;
}) {
  const from = getLastKnownLocForPallet(params.code);
  const to = { kind: params.toKind, id: params.toId };

  // movimento stock
  addStockMove({
    palletType: params.palletType,
    qty: params.qty,
    from,
    to,
    note: params.note,
  });

  // aggiorna pallet lastLoc
  upsertPallet({
    code: params.code,
    type: params.palletType,
    lastLocKind: params.toKind,
    lastLocId: params.toId,
  });

  return { from, to };
}
