/* app/lib/storage.ts
   LocalStorage-backed “database” for the Pallet Tracker.
   Exports are intentionally explicit so pages can import named helpers.
*/

export type PalletItem = {
  id: string;
  type: string;        // e.g. "EUR / EPAL"
  qty: number;
  depot?: string;
  createdAt: number;
};

export type DepotOption = {
  id: string;
  label: string;
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
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

export type StockLocationKind = "DEPOT" | "SHOP";

export type StockMove = {
  id: string;
  kind: "IN" | "OUT";
  palletType: string;
  qty: number;
  locationKind: StockLocationKind;
  locationId: string; // depotId or shopId
  driverId?: string;
  note?: string;
  createdAt: number;
};

export type StockRow = {
  palletType: string;
  locationKind: StockLocationKind;
  locationId: string;
  balance: number;
};

export type ScanHistoryItem = {
  id: string;
  raw: string;
  parsed?: any;
  createdAt: number;
};

const KEYS = {
  PALLETS: "pt_pallets",
  LAST_SCAN: "pt_lastScan",
  HISTORY: "pt_history",
  DEPOTS: "pt_depots",
  DRIVERS: "pt_drivers",
  SHOPS: "pt_shops",
  STOCK_MOVES: "pt_stockMoves",
};

function safeParse<T>(v: string | null, fallback: T): T {
  if (!v) return fallback;
  try {
    return JSON.parse(v) as T;
  } catch {
    return fallback;
  }
}

function readArr<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  return safeParse<T[]>(localStorage.getItem(key), []);
}

function writeArr<T>(key: string, arr: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(arr));
}

function readObj<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return safeParse<T>(localStorage.getItem(key), fallback);
}

function writeObj<T>(key: string, obj: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(obj));
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

/* ---------------- Pallets (simple list) ---------------- */

export function getPallets(): PalletItem[] {
  return readArr<PalletItem>(KEYS.PALLETS).sort((a, b) => b.createdAt - a.createdAt);
}

export function setPallets(items: PalletItem[]) {
  writeArr<PalletItem>(KEYS.PALLETS, items);
}

export function upsertPallet(item: PalletItem) {
  const all = getPallets();
  const idx = all.findIndex((x) => x.id === item.id);
  if (idx >= 0) all[idx] = item;
  else all.unshift(item);
  setPallets(all);
}

export function removePallet(id: string) {
  setPallets(getPallets().filter((x) => x.id !== id));
}

/* ---------------- Depots ---------------- */

export function getDepotOptions(): DepotOption[] {
  const arr = readArr<DepotOption>(KEYS.DEPOTS);
  // Default depots if empty:
  if (!arr.length) {
    const seed: DepotOption[] = [
      { id: "DEPOT_MAIN", label: "Deposito principale" },
      { id: "DEPOT_2", label: "Deposito 2" },
    ];
    writeArr(KEYS.DEPOTS, seed);
    return seed;
  }
  return arr;
}

export function setDepotOptions(items: DepotOption[]) {
  writeArr<DepotOption>(KEYS.DEPOTS, items);
}

export function getDefaultDepot(): string {
  const opts = getDepotOptions();
  return opts[0]?.id ?? "DEPOT_MAIN";
}

/* ---------------- Drivers ---------------- */

export function getDrivers(): DriverItem[] {
  return readArr<DriverItem>(KEYS.DRIVERS).sort((a, b) => b.createdAt - a.createdAt);
}

export function addDriver(d: Omit<DriverItem, "id" | "createdAt">) {
  const all = getDrivers();
  const item: DriverItem = { id: uid("drv"), createdAt: Date.now(), ...d };
  all.unshift(item);
  writeArr(KEYS.DRIVERS, all);
  return item;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "createdAt">>) {
  const all = getDrivers();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  writeArr(KEYS.DRIVERS, all);
  return all[idx];
}

export function removeDriver(id: string) {
  writeArr(KEYS.DRIVERS, getDrivers().filter((x) => x.id !== id));
}

/* ---------------- Shops ---------------- */

export function getShops(): ShopItem[] {
  return readArr<ShopItem>(KEYS.SHOPS).sort((a, b) => b.createdAt - a.createdAt);
}

export function addShop(s: Omit<ShopItem, "id" | "createdAt">) {
  const all = getShops();
  const item: ShopItem = { id: uid("shop"), createdAt: Date.now(), ...s };
  all.unshift(item);
  writeArr(KEYS.SHOPS, all);
  return item;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "createdAt">>) {
  const all = getShops();
  const idx = all.findIndex((x) => x.id === id);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], ...patch };
  writeArr(KEYS.SHOPS, all);
  return all[idx];
}

export function removeShop(id: string) {
  writeArr(KEYS.SHOPS, getShops().filter((x) => x.id !== id));
}

/* ---------------- Scan (Last + History) ---------------- */

export function getLastScan(): any {
  return readObj<any>(KEYS.LAST_SCAN, null);
}

export function setLastScan(v: any) {
  writeObj(KEYS.LAST_SCAN, v);
}

export function getHistory(): ScanHistoryItem[] {
  return readArr<ScanHistoryItem>(KEYS.HISTORY).sort((a, b) => b.createdAt - a.createdAt);
}

export function addHistory(raw: string, parsed?: any) {
  const all = getHistory();
  const item: ScanHistoryItem = { id: uid("hist"), raw, parsed, createdAt: Date.now() };
  all.unshift(item);
  writeArr(KEYS.HISTORY, all);
  return item;
}

export function clearHistory() {
  writeArr(KEYS.HISTORY, []);
}

/* ---------------- Stock Moves ---------------- */

export function getStockMoves(): StockMove[] {
  return readArr<StockMove>(KEYS.STOCK_MOVES).sort((a, b) => b.createdAt - a.createdAt);
}

export function addStockMove(m: Omit<StockMove, "id" | "createdAt">) {
  const all = getStockMoves();
  const item: StockMove = { id: uid("mv"), createdAt: Date.now(), ...m };
  all.unshift(item);
  writeArr(KEYS.STOCK_MOVES, all);
  return item;
}

export function removeStockMove(id: string) {
  writeArr(KEYS.STOCK_MOVES, getStockMoves().filter((x) => x.id !== id));
}

/* Compute current balances grouped by (palletType, locationKind, locationId) */
export function getStockRows(): StockRow[] {
  const moves = getStockMoves();
  const map = new Map<string, StockRow>();

  for (const mv of moves) {
    const key = `${mv.palletType}__${mv.locationKind}__${mv.locationId}`;
    const prev = map.get(key) ?? {
      palletType: mv.palletType,
      locationKind: mv.locationKind,
      locationId: mv.locationId,
      balance: 0,
    };
    const delta = mv.kind === "IN" ? mv.qty : -mv.qty;
    prev.balance += delta;
    map.set(key, prev);
  }

  return Array.from(map.values()).sort((a, b) => b.balance - a.balance);
}

/* CSV export helpers */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  if (typeof window === "undefined") return;

  const escape = (v: any) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
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
