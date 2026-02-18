"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as storage from "../lib/storage";

const PALLET_TYPES = ["EUR / EPAL", "CHEP", "LPR", "IFCO", "DUSS", "ROLL", "Altro"];

export default function StockPage() {
  const [rows, setRows] = useState<storage.StockRow[]>([]);
  const [moves, setMoves] = useState<storage.StockMove[]>([]);
  const [msg, setMsg] = useState<string>("");

  const [palletType, setPalletType] = useState<string>(PALLET_TYPES[0]);
  const [qty, setQty] = useState<number>(1);

  const [fromKind, setFromKind] = useState<storage.StockLocationKind>("DEPOSITO");
  const [fromId, setFromId] = useState<string>("");

  const [toKind, setToKind] = useState<storage.StockLocationKind>("NEGOZIO");
  const [toId, setToId] = useState<string>("");

  const [note, setNote] = useState<string>("");

  const depots = useMemo(() => storage.getDepots(), []);
  const drivers = useMemo(() => storage.getDrivers(), []);
  const shops = useMemo(() => storage.getShops(), []);

  function nameOf(kind: storage.StockLocationKind, id: string) {
    if (!id) return "";
    if (kind === "DEPOSITO") return depots.find((d) => d.id === id)?.name || id;
    if (kind === "AUTISTA") return drivers.find((d) => d.id === id)?.name || id;
    return shops.find((s) => s.id === id)?.name || id;
  }

  function optionsFor(kind: storage.StockLocationKind) {
    if (kind === "DEPOSITO") return depots.map((d) => ({ id: d.id, label: d.name }));
    if (kind === "AUTISTA") return drivers.map((d) => ({ id: d.id, label: d.name }));
    return shops.map((s) => ({ id: s.id, label: s.name }));
  }

  function reload() {
    setRows(storage.getStockRows());
    setMoves(storage.getStockMoves());
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    const opts = optionsFor(fromKind);
    if (opts.length > 0) setFromId(opts[0].id);
    else setFromId("");
  }, [fromKind]);

  useEffect(() => {
    const opts = optionsFor(toKind);
    if (opts.length > 0) setToId(opts[0].id);
    else setToId("");
  }, [toKind]);

  function addMove() {
    setMsg("");

    const q = Number(qty);
    if (!q || q <= 0) return setMsg("Quantità non valida.");
    if (!fromId) return setMsg("Seleziona origine.");
    if (!toId) return setMsg("Seleziona destinazione.");
    if (fromKind === toKind && fromId === toId) return setMsg("Origine e destinazione uguali.");

    const move: storage.StockMove = {
      ts: Date.now(),
      palletType,
      qty: q,
      from: { kind: fromKind, id: fromId },
      to: { kind: toKind, id: toId },
      note: note.trim() || undefined,
    };

    const newMoves = [move, ...storage.getStockMoves()];
    storage.setStockMoves(newMoves);

    const cur = storage.getStockRows();

    function upsert(kind: storage.StockLocationKind, id: string, type: string, delta: number) {
      const name = nameOf(kind, id);
      const idx = cur.findIndex(
        (r) => r.kind === kind && r.id === id && r.palletType === type
      );
      if (idx >= 0) {
        const nextQty = (cur[idx].qty || 0) + delta;
        cur[idx] = { ...cur[idx], qty: nextQty };
        if (cur[idx].qty <= 0) cur.splice(idx, 1);
      } else {
        if (delta > 0) cur.push({ kind, id, name, palletType: type, qty: delta });
      }
    }

    upsert(fromKind, fromId, palletType, -q);
    upsert(toKind, toId, palletType, +q);

    storage.setStockRows(cur);

    setNote("");
    reload();
    setMsg("Movimento registrato ✅");
  }

  function groupedRows() {
    const map = new Map<
      string,
      { kind: storage.StockLocationKind; id: string; name: string; items: storage.StockRow[] }
    >();
    for (const r of rows) {
      const k = `${r.kind}__${r.id}`;
      if (!map.has(k)) map.set(k, { kind: r.kind, id: r.id, name: r.name, items: [] });
      map.get(k)!.items.push(r);
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.kind + a.name).localeCompare(b.kind + b.name)
    );
  }

  function exportStockCsv() {
    const grouped = groupedRows();
    const flat: any[][] = [];
    for (const g of grouped) {
      for (const it of g.items) flat.push([g.kind, g.id, g.name, it.palletType, it.qty]);
    }

    storage.exportCsv(
      "stock_giacenze.csv",
      ["kind", "id", "name", "palletType", "qty"],
      flat
    );
    setMsg("CSV giacenze scaricato ✅");
  }

  async function exportStockPdf() {
    const grouped = groupedRows();
    const flat: any[][] = [];
    for (const g of grouped) {
      for (const it of g.items) flat.push([g.kind, g.id, g.name, it.palletType, it.qty]);
    }

    await storage.exportPdf({
      filename: "stock_giacenze.pdf",
      title: "Giacenze attuali",
      headers: ["Tipo", "ID", "Nome", "Pallet", "Qtà"],
      rows: flat,
    });
    setMsg("PDF giacenze scaricato ✅");
  }

  function exportMovesCsv() {
    storage.exportCsv(
      "stock_movimenti.csv",
      ["ts", "palletType", "qty", "fromKind", "fromId", "fromName", "toKind", "toId", "toName", "note"],
      moves.map((x) => [
        new Date(x.ts).toISOString(),
        x.palletType,
        x.qty,
        x.from.kind,
        x.from.id,
        nameOf(x.from.kind, x.from.id),
        x.to.kind,
        x.to.id,
        nameOf(x.to.kind, x.to.id),
        x.note || "",
      ])
    );
    setMsg("CSV movimenti scaricato ✅");
  }

  async function exportMovesPdf() {
    await storage.exportPdf({
      filename: "stock_movimenti.pdf",
      title: "Movimenti",
      headers: ["Data", "Pallet", "Qtà", "Da", "A", "Note"],
      rows: moves.map((x) => [
        new Date(x.ts).toLocaleString(),
        x.palletType,
        x.qty,
        `${x.from.kind} - ${nameOf(x.from.kind, x.from.id)}`,
        `${x.to.kind} - ${nameOf(x.to.kind, x.to.id)}`,
        x.note || "",
      ]),
    });
    setMsg("PDF movimenti scaricato ✅");
  }

  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };

  const input: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  const smallBtn = (bg: string): React.CSSProperties => ({
    padding: "10px 12px",
    borderRadius: 14,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    background: bg,
    color: "white",
    whiteSpace: "nowrap",
  });

  const grouped = groupedRows();

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>📦 Stock</h1>

      <div style={card}>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <select value={palletType} onChange={(e) => setPalletType(e.target.value)} style={input}>
            {PALLET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            style={input}
            placeholder="Qtà"
          />
        </div>

        <div style={{ display: "grid", gap: 10, marginTop: 10, gridTemplateColumns: "1fr 1fr" }}>
          <select value={fromKind} onChange={(e) => setFromKind(e.target.value as storage.StockLocationKind)} style={input}>
            <option value="DEPOSITO">Deposito</option>
            <option value="NEGOZIO">Negozio</option>
            <option value="AUTISTA">Autista</option>
          </select>

          <select value={fromId} onChange={(e) => setFromId(e.target.value)} style={input}>
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

          <select value={toKind} onChange={(e) => setToKind(e.target.value as storage.StockLocationKind)} style={input}>
            <option value="DEPOSITO">Deposito</option>
            <option value="NEGOZIO">Negozio</option>
            <option value="AUTISTA">Autista</option>
          </select>

          <select value={toId} onChange={(e) => setToId(e.target.value)} style={input}>
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

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          style={{ ...input, marginTop: 10 }}
          placeholder="Nota (opzionale)"
        />

        <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
          <button onClick={addMove} style={smallBtn("#1976d2")}>
            Registra movimento
          </button>

          <button onClick={exportStockCsv} style={smallBtn("#2e7d32")}>
            ⬇️ Export Giacenze CSV
          </button>

          <button onClick={exportStockPdf} style={smallBtn("#e53935")}>
            ⬇️ PDF Giacenze
          </button>

          <button onClick={exportMovesCsv} style={smallBtn("#455a64")}>
            ⬇️ Export Movimenti CSV
          </button>

          <button onClick={exportMovesPdf} style={smallBtn("#6a1b9a")}>
            ⬇️ PDF Movimenti
          </button>
        </div>

        {msg ? <div style={{ marginTop: 10, fontWeight: 800 }}>{msg}</div> : null}
      </div>

      <div style={{ marginTop: 14, ...card }}>
        <h2 style={{ marginTop: 0 }}>🧺 Giacenze attuali</h2>

        {grouped.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessuna giacenza registrata.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {grouped.map((g) => (
              <div key={`${g.kind}__${g.id}`} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {g.kind === "DEPOSITO" ? "🏭" : g.kind === "NEGOZIO" ? "🏪" : "🚚"} {g.name}
                </div>

                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  {g.items
                    .sort((a, b) => a.palletType.localeCompare(b.palletType))
                    .map((it) => (
                      <div key={`${it.palletType}`} style={{ display: "flex", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 800 }}>{it.palletType}</div>
                        <div style={{ fontWeight: 900 }}>{it.qty}</div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, ...card }}>
        <h2 style={{ marginTop: 0 }}>🧾 Ultimi movimenti</h2>
        {moves.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun movimento.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {moves.slice(0, 30).map((m, i) => (
              <div key={i} style={{ border: "1px solid #eee", borderRadius: 14, padding: 10 }}>
                <div style={{ fontWeight: 900 }}>
                  {new Date(m.ts).toLocaleString()} — {m.palletType} × {m.qty}
                </div>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  Da: {m.from.kind} / {nameOf(m.from.kind, m.from.id)} → A: {m.to.kind} /{" "}
                  {nameOf(m.to.kind, m.to.id)}
                </div>
                {m.note ? <div style={{ marginTop: 4, fontWeight: 700 }}>Nota: {m.note}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
      }
