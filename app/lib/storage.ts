"use client";

/* =========================================================
   STORAGE + EXPORT (CSV / PDF)
   ========================================================= */

export type StockLocationKind = "DEPOSITO" | "NEGOZIO" | "AUTISTA";

export type ScanEvent = {
  id: string;
  code: string;
  ts: number;
  lat?: number;
  lng?: number;
  accuracy?: number;
  source?: "qr" | "manual";
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
  lastLocKind?: StockLocationKind;
  lastLocId?: string;
  companyId?: string; // 👈 NUOVO
};

export type DriverItem = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt?: number;
  companyId?: string; // 👈 NUOVO
};

export type DepotItem = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt?: number;
  companyId?: string; // 👈 NUOVO
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
  createdAt?: number;
  companyId?: string; // 👈 NUOVO
};

export type StockRow = {
  kind: StockLocationKind;
  id: string;
  name: string;
  palletType: string;
  qty: number;
};

export type StockMove = {
  ts: number;
  palletType: string;
  qty: number;
  from: { kind: StockLocationKind; id: string };
  to: { kind: StockLocationKind; id: string };
  note?: string;
};

/* =========================================================
   KEYS
   ========================================================= */

const KEY_HISTORY = "pallet_history";
const KEY_PALLETS = "pallet_items";
const KEY_LASTSCAN = "pallet_lastscan";

const KEY_DRIVERS = "pallet_drivers";
const KEY_DEPOTS = "pallet_depots";
const KEY_SHOPS = "pallet_shops";

const KEY_STOCK = "pallet_stock_rows";
const KEY_STOCK_MOVES = "pallet_stock_moves";

/* =========================================================
   SAFE PARSE
   ========================================================= */

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* =========================================================
   DOWNLOAD HELPERS
   ========================================================= */

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function escapeCsvCell(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv(filename: string, headers: string[], rows: any[][]) {
  if (typeof window === "undefined") return;

  const lines: string[] = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const r of rows) lines.push(r.map(escapeCsvCell).join(","));

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
}

export async function exportPdf(opts: {
  filename: string;
  title: string;
  headers: string[];
  rows: any[][];
}) {
  if (typeof window === "undefined") return;

  const { filename, title, headers, rows } = opts;

  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

  const marginX = 40;
  let y = 50;

  doc.setFontSize(14);
  doc.text(title, marginX, y);
  y += 18;

  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), marginX, y);
  y += 14;

  // @ts-ignore
  const autoTable = (autoTableMod as any).default ?? (autoTableMod as any);
  autoTable(doc, {
    head: [headers],
    body: rows.map((r) => r.map((v) => (v ?? "").toString())),
    startY: y + 10,
    margin: { left: marginX, right: marginX },
    styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
    headStyles: { fillColor: [240, 240, 240] },
  });

  doc.save(filename);
}

/* =========================================================
   HISTORY
   ========================================================= */

export function getHistory(): ScanEvent[] {
  if (typeof window === "undefined") return [];
  return safeParse<ScanEvent[]>(localStorage.getItem(KEY_HISTORY), []);
}

export function setHistory(items: ScanEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_HISTORY, JSON.stringify(items));
}

export function addHistory(ev: Omit<ScanEvent, "id">) {
  const items = getHistory();
  items.unshift({ id: uid("scan"), ...ev });
  setHistory(items.slice(0, 2000));
}

export function setLastScan(code: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_LASTSCAN, code);
}

export function getLastScan(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(KEY_LASTSCAN) || "";
}

/* =========================================================
   PALLETS
   ========================================================= */

export function getPallets(): PalletItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<PalletItem[]>(localStorage.getItem(KEY_PALLETS), []);
}

export function setPallets(items: PalletItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PALLETS, JSON.stringify(items));
}

export function findPalletByCode(code: string): PalletItem | null {
  const c = (code || "").trim().toLowerCase();
  if (!c) return null;
  const items = getPallets();
  return (
    items.find((p) => p.code.toLowerCase() === c) ||
    items.find((p) => (p.altCode || "").toLowerCase() === c) ||
    null
  );
}

export function upsertPallet(
  update: Partial<PalletItem> & { code: string },
  companyId?: string // 👈 NUOVO parametro opzionale
): PalletItem | null {
  const items = getPallets();
  const codeNorm = (update.code || "").trim();
  if (!codeNorm) return null;

  const idx = items.findIndex(
    (p) =>
      p.code.toLowerCase() === codeNorm.toLowerCase() ||
      (p.altCode || "").toLowerCase() === codeNorm.toLowerCase()
  );

  if (idx >= 0) {
    items[idx] = { ...items[idx], ...update, code: items[idx].code };
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
      companyId, // 👈 salviamo se presente
    });
  }

  setPallets(items);
  return idx >= 0 ? items[idx] : items[0];
}

/* =========================================================
   LISTE (drivers/depots/shops) + CRUD
   ========================================================= */

export function getDrivers(): DriverItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<DriverItem[]>(localStorage.getItem(KEY_DRIVERS), []);
}

export function setDrivers(items: DriverItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_DRIVERS, JSON.stringify(items.slice(0, 200)));
}

export function addDriver(
  data: Omit<DriverItem, "id" | "createdAt" | "companyId">,
  companyId?: string // 👈 NUOVO parametro opzionale
): DriverItem {
  const items = getDrivers();
  const it: DriverItem = {
    id: uid("drv"),
    name: (data.name || "").trim(),
    phone: (data.phone || "").trim() || undefined,
    address: (data.address || "").trim() || undefined,
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    notes: (data.notes || "").trim() || undefined,
    createdAt: Date.now(),
    companyId, // 👈 salviamo se presente
  };
  items.unshift(it);
  setDrivers(items);
  return it;
}

export function updateDriver(id: string, patch: Partial<Omit<DriverItem, "id" | "companyId">>) {
  const items = getDrivers();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch };
  setDrivers(items);
}

export function deleteDriver(id: string) {
  const items = getDrivers().filter((x) => x.id !== id);
  setDrivers(items);
}

export function getDepots(): DepotItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<DepotItem[]>(localStorage.getItem(KEY_DEPOTS), []);
}

export function setDepots(items: DepotItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_DEPOTS, JSON.stringify(items.slice(0, 200)));
}

export function addDepot(
  data: Omit<DepotItem, "id" | "createdAt" | "companyId">,
  companyId?: string // 👈 NUOVO parametro opzionale
): DepotItem {
  const items = getDepots();
  const it: DepotItem = {
    id: uid("dep"),
    name: (data.name || "").trim(),
    phone: (data.phone || "").trim() || undefined,
    address: (data.address || "").trim() || undefined,
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    notes: (data.notes || "").trim() || undefined,
    createdAt: Date.now(),
    companyId, // 👈 salviamo se presente
  };
  items.unshift(it);
  setDepots(items);
  return it;
}

export function updateDepot(id: string, patch: Partial<Omit<DepotItem, "id" | "companyId">>) {
  const items = getDepots();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch };
  setDepots(items);
}

export function deleteDepot(id: string) {
  const items = getDepots().filter((x) => x.id !== id);
  setDepots(items);
}

export function getShops(): ShopItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<ShopItem[]>(localStorage.getItem(KEY_SHOPS), []);
}

export function setShops(items: ShopItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SHOPS, JSON.stringify(items.slice(0, 500)));
}

export function addShop(
  data: Omit<ShopItem, "id" | "createdAt" | "companyId">,
  companyId?: string // 👈 NUOVO parametro opzionale
): ShopItem {
  const items = getShops();
  const it: ShopItem = {
    id: uid("shop"),
    name: (data.name || "").trim(),
    code: (data.code || "").trim() || undefined,
    phone: (data.phone || "").trim() || undefined,
    address: (data.address || "").trim() || undefined,
    lat: typeof data.lat === "number" ? data.lat : undefined,
    lng: typeof data.lng === "number" ? data.lng : undefined,
    notes: (data.notes || "").trim() || undefined,
    createdAt: Date.now(),
    companyId, // 👈 salviamo se presente
  };
  items.unshift(it);
  setShops(items);
  return it;
}

export function updateShop(id: string, patch: Partial<Omit<ShopItem, "id" | "companyId">>) {
  const items = getShops();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  items[idx] = { ...items[idx], ...patch };
  setShops(items);
}

export function deleteShop(id: string) {
  const items = getShops().filter((x) => x.id !== id);
  setShops(items);
}

/* =========================================================
   STOCK
   ========================================================= */

export function getStockRows(): StockRow[] {
  if (typeof window === "undefined") return [];
  return safeParse<StockRow[]>(localStorage.getItem(KEY_STOCK), []);
}

export function setStockRows(items: StockRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_STOCK, JSON.stringify(items));
}

export function getStockMoves(): StockMove[] {
  if (typeof window === "undefined") return [];
  return safeParse<StockMove[]>(localStorage.getItem(KEY_STOCK_MOVES), []);
}

export function setStockMoves(items: StockMove[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_STOCK_MOVES, JSON.stringify(items.slice(0, 5000)));
}

/* =========================================================
   UTIL
   ========================================================= */

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;
}
