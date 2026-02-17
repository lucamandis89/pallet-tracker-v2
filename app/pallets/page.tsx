// app/pallets/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { downloadCsv, getLastScan, getPallets, PalletItem, setPallets, upsertPallet } from "../lib/storage";

const PALLET_TYPES = [
  "EUR / EPAL",
  "CHEP",
  "CP (Chemical)",
  "H1 Plastica",
  "Mezza pedana",
  "Altro",
];

export default function PalletsPage() {
  const [items, setItems] = useState<PalletItem[]>([]);
  const [q, setQ] = useState("");

  const [code, setCode] = useState("");
  const [altCode, setAltCode] = useState("");
  const [type, setType] = useState<string>(PALLET_TYPES[0]);
  const [notes, setNotes] = useState("");

  const [editId, setEditId] = useState<string | null>(null);

  function reload() {
    setItems(getPallets());
  }

  useEffect(() => {
    reload();
    // precompila col last scan se presente
    const last = getLastScan();
    if (last) setCode((prev) => prev || last);
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((p) => {
      const hay = `${p.code} ${p.altCode || ""} ${p.type || ""} ${p.notes || ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [items, q]);

  function resetForm() {
    setEditId(null);
    setCode("");
    setAltCode("");
    setType(PALLET_TYPES[0]);
    setNotes("");
  }

  function onSubmit() {
    const c = code.trim();
    if (!c) return alert("Inserisci un codice pedana (QR o manuale).");

    // se stai editando, aggiorno l’elemento specifico
    if (editId) {
      const all = getPallets();
      const idx = all.findIndex((x) => x.id === editId);
      if (idx < 0) {
        alert("Elemento non trovato, ricarico lista.");
        reload();
        return;
      }
      all[idx] = {
        ...all[idx],
        code: c,
        altCode: altCode.trim() || undefined,
        type: type || undefined,
        notes: notes.trim() || undefined,
      };
      setPallets(all);
      reload();
      resetForm();
      return;
    }

    // nuovo / upsert su code o altCode
    upsertPallet({
      code: c,
      altCode: altCode.trim() || undefined,
      type: type || undefined,
      notes: notes.trim() || undefined,
    });
    reload();
    resetForm();
  }

  function onEdit(p: PalletItem) {
    setEditId(p.id);
    setCode(p.code || "");
    setAltCode(p.altCode || "");
    setType(p.type || PALLET_TYPES[0]);
    setNotes(p.notes || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questa pedana dal registro?")) return;
    const all = getPallets().filter((x) => x.id !== id);
    setPallets(all);
    reload();
  }

  function exportCsv() {
    const all = getPallets();
    downloadCsv(
      "registro_pedane.csv",
      ["code", "altCode", "type", "notes", "lastSeen", "lat", "lng", "source"],
      all.map((p) => [
        p.code,
        p.altCode || "",
        p.type || "",
        p.notes || "",
        p.lastSeenTs ? new Date(p.lastSeenTs).toISOString() : "",
        p.lastLat ?? "",
        p.lastLng ?? "",
        p.lastSource || "",
      ])
    );
  }

  const btn = (bg: string) => ({
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color: "white",
  });

  const input = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    fontWeight: 700 as const,
    width: "100%",
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🧱 Registro Pedane</h1>
      <div style={{ opacity: 0.85, fontWeight: 700 }}>
        Qui registri pedane anche quando il QR è rovinato (codice manuale / codice alternativo).
      </div>

      {/* Form */}
      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 18,
          border: "1px solid #e6e6e6",
          background: "white",
        }}
      >
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {editId ? "✏️ Modifica pedana" : "➕ Nuova pedana"}
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Codice pedana (principale)</div>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Es: PEDANA-000123" style={input} />
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              Suggerimento: se il QR non si legge, inserisci qui il codice manuale.
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Codice alternativo (fallback)</div>
            <input
              value={altCode}
              onChange={(e) => setAltCode(e.target.value)}
              placeholder="Es: 0123 (codice breve scritto a penna)"
              style={input}
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Tipologia pedana</div>
            <select value={type} onChange={(e) => setType(e.target.value)} style={input as any}>
              {PALLET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Note</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es: negozio X, danneggiata, da ritirare..."
              style={input}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={onSubmit} style={btn("#2e7d32")}>
              {editId ? "Salva modifiche" : "Aggiungi al registro"}
            </button>

            <button onClick={resetForm} style={{ ...btn("#616161") }}>
              Annulla
            </button>

            <a href="/scan" style={{ ...btn("#0b1220"), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              📷 Vai a Scanner
            </a>

            <button onClick={exportCsv} style={btn("#6a1b9a")}>
              ⬇️ Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginTop: 14 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔎 Cerca per codice, codice alternativo, tipo, note..."
          style={{ ...input, background: "white" }}
        />
      </div>

      {/* List */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 14, borderRadius: 18, border: "1px solid #eee", background: "white" }}>
            Nessuna pedana trovata.
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 14,
                borderRadius: 18,
                border: "1px solid #e6e6e6",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
                  <div style={{ opacity: 0.85, fontWeight: 700 }}>
                    {p.type || "—"} {p.altCode ? ` • alt: ${p.altCode}` : ""}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => onEdit(p)} style={btn("#1e88e5")}>
                    Modifica
                  </button>
                  <button onClick={() => onDelete(p.id)} style={btn("#e53935")}>
                    Elimina
                  </button>
                </div>
              </div>

              {p.notes ? <div style={{ marginTop: 8, fontWeight: 700 }}>{p.notes}</div> : null}

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.85 }}>
                Ultimo rilevamento:{" "}
                {p.lastSeenTs ? new Date(p.lastSeenTs).toLocaleString() : "—"}{" "}
                {p.lastSource ? `(${p.lastSource})` : ""}
                {typeof p.lastLat === "number" && typeof p.lastLng === "number"
                  ? ` • GPS: ${p.lastLat.toFixed(6)}, ${p.lastLng.toFixed(6)}`
                  : ""}
              </div>
            </div>
          ))
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
