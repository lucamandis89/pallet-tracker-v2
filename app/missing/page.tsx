"use client";

import React, { useEffect, useMemo, useState } from "react";

type PalletStatus = "IN_DEPOSITO" | "IN_TRANSITO" | "IN_NEGOZIO";

type Pallet = {
  id: string;
  code: string;
  type: string;
  status: PalletStatus;
  locationLabel: string;
  updatedAt: string; // string locale
  createdAt: string; // string locale
};

const STORAGE_PALLETS = "pallet_registry";

function safeParse<T>(raw: string | null, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// prova a convertire una stringa locale in Date.
// fallback: se non parse, ritorna null.
function parseLocalDate(s: string): Date | null {
  if (!s) return null;

  // 1) prova Date(s)
  const d1 = new Date(s);
  if (!isNaN(d1.getTime())) return d1;

  // 2) prova formato comune italiano: "DD/MM/YYYY, HH:MM:SS" oppure "DD/MM/YYYY HH:MM:SS"
  const cleaned = s.replace(",", " ").trim();
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]) - 1;
    const yyyy = Number(m[3]);
    const hh = Number(m[4]);
    const mi = Number(m[5]);
    const ss = m[6] ? Number(m[6]) : 0;
    const d2 = new Date(yyyy, mm, dd, hh, mi, ss);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function toCSV(rows: any[]) {
  if (!rows.length) return "code,type,status,locationLabel,updatedAt,daysOut\n";

  const header = ["code", "type", "status", "locationLabel", "updatedAt", "daysOut"];
  const esc = (v: any) => {
    const s = v === undefined || v === null ? "" : String(v);
    const needs = /[",\n;]/.test(s);
    const out = s.replace(/"/g, '""');
    return needs ? `"${out}"` : out;
  };

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([r.code, r.type, r.status, r.locationLabel, r.updatedAt, r.daysOut].map(esc).join(","));
  }
  return lines.join("\n");
}

export default function MissingPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [q, setQ] = useState("");
  const [minDays, setMinDays] = useState<number>(7);

  useEffect(() => {
    const reg = safeParse<Pallet[]>(localStorage.getItem(STORAGE_PALLETS), []);
    setPallets(reg);
  }, []);

  const computed = useMemo(() => {
    const now = new Date();

    // consideriamo "mancanti" solo se fuori deposito:
    const out = pallets.filter((p) => p.status === "IN_NEGOZIO" || p.status === "IN_TRANSITO");

    const enriched = out.map((p) => {
      const d = parseLocalDate(p.updatedAt) ?? parseLocalDate(p.createdAt);
      const daysOut = d ? daysBetween(now, d) : null;

      return {
        ...p,
        daysOut: daysOut ?? "—",
        _daysOutNum: typeof daysOut === "number" ? daysOut : 0,
      };
    });

    // filtro soglia giorni
    const byDays = enriched.filter((p) => (typeof p._daysOutNum === "number" ? p._daysOutNum >= minDays : false));

    // filtro ricerca
    const s = q.trim().toLowerCase();
    const filtered = !s
      ? byDays
      : byDays.filter((p) => {
          const hay = `${p.code} ${p.type} ${p.status} ${p.locationLabel} ${p.updatedAt}`.toLowerCase();
          return hay.includes(s);
        });

    // ordina: più giorni fuori prima
    filtered.sort((a, b) => b._daysOutNum - a._daysOutNum);

    return filtered;
  }, [pallets, q, minDays]);

  function exportCSV() {
    const csv = toCSV(computed);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedane_mancanti_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontSize: 16,
    background: "white",
  };

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const card: React.CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 16,
    padding: 14,
    background: "white",
  };

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚨 Pedane Mancanti</h1>
      <div style={{ opacity: 0.85, marginBottom: 14 }}>
        Elenco pedane fuori dal deposito (in negozio / in transito) da almeno X giorni. Export CSV.
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <a
          href="/"
          style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          ← Home
        </a>
        <a
          href="/pallets"
          style={{ ...btn("#2e7d32"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          🧱 Registro Pedane
        </a>
        <button style={btn("#6a1b9a")} onClick={exportCSV} disabled={computed.length === 0}>
          ⬇️ Export CSV
        </button>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Filtri</div>
        <div style={{ display: "grid", gap: 10 }}>
          <input style={inputStyle} value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔎 Cerca (codice, tipo, posizione, data)" />
          <input
            style={inputStyle}
            type="number"
            value={minDays}
            onChange={(e) => setMinDays(Number(e.target.value))}
            placeholder="Giorni minimi fuori (es. 7)"
          />
          <div style={{ fontSize: 13, opacity: 0.75 }}>
            Mostro pedane fuori da almeno <b>{minDays}</b> giorni.
          </div>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ fontWeight: 900 }}>Risultati: {computed.length}</div>
        <div style={{ fontSize: 13, opacity: 0.75, marginTop: 6 }}>
          Nota: i “giorni fuori” sono calcolati da <b>updatedAt</b> del registro pedane.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {computed.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna pedana mancante secondo i filtri attuali.</div>
        ) : (
          computed.map((p) => (
            <div key={p.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
                  <div style={{ marginTop: 6 }}>
                    Tipo: <b>{p.type}</b>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    Posizione: <b>{p.locationLabel}</b>
                  </div>
                  <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
                    Ultimo update: {p.updatedAt}
                  </div>
                </div>

                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: 999,
                    background: "#ffebee",
                    color: "#b71c1c",
                    fontWeight: 1000,
                    height: "fit-content",
                  }}
                >
                  {p.daysOut} giorni fuori
                </div>
              </div>

              <div style={{ marginTop: 10, opacity: 0.9 }}>
                Stato: <b>{p.status === "IN_NEGOZIO" ? "IN NEGOZIO" : "IN TRANSITO"}</b>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
