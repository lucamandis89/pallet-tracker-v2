"use client";

import React, { useEffect, useMemo, useState } from "react";

type HistoryItem = {
  id: string;
  pedanaCode: string;
  ts: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  driverName?: string;
  shopName?: string;
  depotName?: string;
};

const STORAGE_HISTORY = "pallet_history";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function toCSV(rows: HistoryItem[]) {
  const header = [
    "id",
    "timestamp",
    "pedanaCode",
    "lat",
    "lng",
    "accuracy",
    "driverName",
    "shopName",
    "depotName",
  ];

  const esc = (v: any) => {
    const s = v === undefined || v === null ? "" : String(v);
    const needs = /[",\n;]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.ts,
        r.pedanaCode,
        r.lat ?? "",
        r.lng ?? "",
        r.accuracy ?? "",
        r.driverName ?? "",
        r.shopName ?? "",
        r.depotName ?? "",
      ].map(esc).join(",")
    );
  }
  return lines.join("\n");
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    const saved = safeParse<HistoryItem[]>(localStorage.getItem(STORAGE_HISTORY), []);
    setItems(saved);
  }, []);

  function refresh() {
    const saved = safeParse<HistoryItem[]>(localStorage.getItem(STORAGE_HISTORY), []);
    setItems(saved);
  }

  function clearAll() {
    if (!confirm("Vuoi svuotare TUTTO lo storico?")) return;
    localStorage.removeItem(STORAGE_HISTORY);
    setItems([]);
  }

  function exportCSV() {
    const csv = toCSV(items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pallet_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      const hay = `${x.pedanaCode} ${x.ts} ${x.driverName ?? ""} ${x.shopName ?? ""} ${x.depotName ?? ""} ${x.lat ?? ""} ${x.lng ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  const inputStyle = { padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", fontSize: 16 };
  const btn = (bg: string) => ({ padding: "12px 14px", borderRadius: 12, border: "none", fontWeight: 900 as const, cursor: "pointer", background: bg, color: "white" });

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📄 Storico Scansioni</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        Totale record: <b>{items.length}</b>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button style={btn("#6a1b9a")} onClick={exportCSV} disabled={items.length === 0}>
          ⬇️ Export CSV
        </button>
        <button style={btn("#9e9e9e")} onClick={refresh}>
          🔄 Aggiorna
        </button>
        <button style={btn("#e53935")} onClick={clearAll} disabled={items.length === 0}>
          🗑️ Svuota
        </button>
        <a href="/scan" style={{ ...btn("#1565c0"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          ← Torna a Scan
        </a>
        <a href="/" style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          ← Home
        </a>
      </div>

      <div style={{ marginTop: 12 }}>
        <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Cerca (codice, data, autista, negozio, deposito, lat/lng)" />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun record nello storico.</div>
        ) : (
          filtered.map((x) => (
            <div key={x.id} style={{ border: "1px solid #eee", borderRadius: 16, padding: 14, background: "white" }}>
              <div style={{ fontWeight: 900, fontSize: 18 }}>{x.pedanaCode}</div>
              <div style={{ marginTop: 6, opacity: 0.8 }}>🕒 {x.ts}</div>

              <div style={{ marginTop: 8, lineHeight: 1.6 }}>
                {x.driverName ? <>🚚 Autista: <b>{x.driverName}</b><br /></> : null}
                {x.shopName ? <>🏪 Negozio: <b>{x.shopName}</b><br /></> : null}
                {x.depotName ? <>🏭 Deposito: <b>{x.depotName}</b><br /></> : null}
                📍 GPS: {x.lat ?? "-"}, {x.lng ?? "-"} {x.accuracy ? `(±${Math.round(x.accuracy)}m)` : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
