"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  addStockMove,
  downloadCsv,
  getDefaultDepot,
  getDepotOptions,
  getDrivers,
  getShops,
  getStockMoves,
  getStockRows,
  StockLocationKind,
} from "../lib/storage";

const PALLET_TYPES = [
  "EUR / EPAL",
  "CHEP",
  "LPR",
  "IFCO",
  "DUSS",
  "ROOL",
  "Altro",
];

export default function StockPage() {
  const [rows, setRows] = useState(getStockRows());
  const [moves, setMoves] = useState(getStockMoves());

  // form movimento
  const [palletType, setPalletType] = useState(PALLET_TYPES[0]);
  const [qty, setQty] = useState<number>(1);

  const [fromKind, setFromKind] = useState<StockLocationKind>("DEPOSITO");
  const [fromId, setFromId] = useState<string>(getDefaultDepot().id);

  const [toKind, setToKind] = useState<StockLocationKind>("NEGOZIO");
  const [toId, setToId] = useState<string>("");

  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");

  const depots = useMemo(() => getDepotOptions(), []);
  const drivers = useMemo(() => getDrivers(), []);
  const shops = useMemo(() => getShops(), []);

  function reload() {
    setRows(getStockRows());
    setMoves(getStockMoves());
  }

  useEffect(() => {
    // default ToId se esiste qualcosa
    if (!toId) {
      if (toKind === "NEGOZIO" && shops[0]?.id) setToId(shops[0].id);
      if (toKind === "AUTISTA" && drivers[0]?.id) setToId(drivers[0].id);
      if (toKind === "DEPOSITO" && depots[0]?.id) setToId(depots[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // aggiorna id quando cambi kind
    if (fromKind === "DEPOSITO") setFromId(getDefaultDepot().id);
    if (fromKind === "NEGOZIO") setFromId(shops[0]?.id || "");
    if (fromKind === "AUTISTA") setFromId(drivers[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKind]);

  useEffect(() => {
    if (toKind === "DEPOSITO") setToId(getDefaultDepot().id);
    if (toKind === "NEGOZIO") setToId(shops[0]?.id || "");
    if (toKind === "AUTISTA") setToId(drivers[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toKind]);

  function nameOf(kind: StockLocationKind, id: string) {
    if (kind === "DEPOSITO") return depots.find((d) => d.id === id)?.name || "Deposito";
    if (kind === "AUTISTA") return drivers.find((d) => d.id === id)?.name || "Autista";
    return shops.find((s) => s.id === id)?.name || "Negozio";
  }

  function optionsFor(kind: StockLocationKind) {
    if (kind === "DEPOSITO") return depots.map((d) => ({ id: d.id, label: d.name }));
    if (kind === "AUTISTA") return drivers.map((d) => ({ id: d.id, label: d.name }));
    return shops.map((s) => ({ id: s.id, label: s.name }));
  }

  const grouped = useMemo(() => {
    // raggruppa: kind+id -> palletType -> qty
    const map = new Map<string, { kind: StockLocationKind; id: string; byType: Record<string, number> }>();

    for (const r of rows) {
      const key = `${r.locationKind}::${r.locationId}`;
      if (!map.has(key)) map.set(key, { kind: r.locationKind, id: r.locationId, byType: {} });
      map.get(key)!.byType[r.palletType] = (map.get(key)!.byType[r.palletType] || 0) + (r.qty || 0);
    }

    return Array.from(map.values());
  }, [rows]);

  function addMove() {
    setMsg("");

    const qn = Number(qty);
    if (!Number.isFinite(qn) || qn <= 0) return alert("Quantità non valida.");
    if (!palletType) return alert("Seleziona il tipo pedana.");

    if (!fromId) return alert("Seleziona il FROM.");
    if (!toId) return alert("Seleziona il TO.");

    try {
      addStockMove({
        palletType,
        qty: qn,
        from: { kind: fromKind, id: fromId },
        to: { kind: toKind, id: toId },
        note: note.trim() || undefined,
      });

      setNote("");
      setQty(1);
      reload();
      setMsg("✅ Movimento registrato.");
    } catch (e: any) {
      alert("Errore movimento: " + (e?.message || "sconosciuto"));
    }
  }

  function exportStockCsv() {
    const flat: any[][] = [];
    for (const g of grouped) {
      const loc = `${g.kind}:${nameOf(g.kind, g.id)}`;
      for (const [t, q] of Object.entries(g.byType)) {
        flat.push([g.kind, g.id, nameOf(g.kind, g.id), t, q]);
      }
    }
    downloadCsv("stock_giacenze.csv", ["locationKind", "locationId", "locationName", "palletType", "qty"], flat);
  }

  function exportMovesCsv() {
    downloadCsv(
      "stock_movimenti.csv",
      ["ts", "palletType", "qty", "fromKind", "fromId", "fromName", "toKind", "toId", "toName", "note"],
      moves.map((m) => [
        new Date(m.ts).toISOString(),
        m.palletType,
        m.qty,
        m.from.kind,
        m.from.id,
        nameOf(m.from.kind, m.from.id),
        m.to.kind,
        m.to.id,
        nameOf(m.to.kind, m.to.id),
        m.note || "",
      ])
    );
  }

  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const input: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  const btn = (bg: string, color = "white") => ({
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color,
  });

  return (
    <div style={{ padding: 16, maxWidth: 980, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Giacenze (Stock)</h1>
      <div style={{ opacity: 0.85, fontWeight: 700 }}>
        Registra movimenti “Da → A” e controlla le giacenze per deposito/negozio/autista.
      </div>

      {/* MOVIMENTO */}
      <div style={{ ...card, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>🔁 Registra movimento Stock</h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tipo pedana</div>
            <select value={palletType} onChange={(e) => setPalletType(e.target.value)} style={input as any}>
              {PALLET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Quantità</div>
            <input
              type="number"
              value={qty}
              min={1}
              onChange={(e) => setQty(Number(e.target.value))}
              style={input}
              inputMode="numeric"
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Facoltative" style={input} />
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" , marginTop: 10}}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>DA (FROM)</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <select value={fromKind} onChange={(e) => setFromKind(e.target.value as any)} style={input as any}>
                <option value="DEPOSITO">Deposito</option>
                <option value="NEGOZIO">Negozio</option>
                <option value="AUTISTA">Autista</option>
              </select>

              <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={input as any}>
                {optionsFor(fromKind).length === 0 ? (
                  <option value="">(Nessuna voce)</option>
                ) : (
                  optionsFor(fromKind).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>A (TO)</div>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <select value={toKind} onChange={(e) => setToKind(e.target.value as any)} style={input as any}>
                <option value="DEPOSITO">Deposito</option>
                <option value="NEGOZIO">Negozio</option>
                <option value="AUTISTA">Autista</option>
              </select>

              <select value={toId} onChange={(e) => setToId(e.target.value)} style={input as any}>
                {optionsFor(toKind).length === 0 ? (
                  <option value="">(Nessuna voce)</option>
                ) : (
                  optionsFor(toKind).map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={addMove} style={btn("#1e88e5")}>
            Registra movimento
          </button>

          <button onClick={exportStockCsv} style={btn("#2e7d32")}>
            ⬇️ Export Giacenze CSV
          </button>

          <button onClick={exportMovesCsv} style={btn("#6a1b9a")}>
            ⬇️ Export Movimenti CSV
          </button>
        </div>

        {msg ? (
          <div style={{ marginTop: 10, fontWeight: 900, color: msg.includes("✅") ? "#2e7d32" : "#c62828" }}>
            {msg}
          </div>
        ) : null}
      </div>

      {/* GIACENZE */}
      <div style={{ ...card, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>📦 Giacenze attuali</h2>

        {grouped.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna giacenza registrata (fai un movimento).</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {grouped.map((g) => (
              <div key={`${g.kind}::${g.id}`} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {g.kind === "DEPOSITO" ? "🏭" : g.kind === "NEGOZIO" ? "🏪" : "🚚"}{" "}
                  {nameOf(g.kind, g.id)}
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {Object.entries(g.byType).map(([t, q]) => (
                    <div key={t} style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <div>{t}</div>
                      <div>{q}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  ID: {g.id}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MOVIMENTI */}
      <div style={{ ...card, marginTop: 14 }}>
        <h2 style={{ marginTop: 0 }}>🧾 Storico movimenti Stock</h2>

        {moves.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun movimento registrato.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {moves.slice(0, 50).map((m) => (
              <div key={m.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  {m.palletType} • Qty {m.qty}
                </div>
                <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.85 }}>
                  Da: {m.from.kind} / {nameOf(m.from.kind, m.from.id)} → A: {m.to.kind} / {nameOf(m.to.kind, m.to.id)}
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                  {new Date(m.ts).toLocaleString()} {m.note ? ` • Note: ${m.note}` : ""}
                </div>
              </div>
            ))}
            {moves.length > 50 ? <div style={{ opacity: 0.7 }}>Mostrati ultimi 50.</div> : null}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
