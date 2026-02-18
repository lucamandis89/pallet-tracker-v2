"use client";

import React, { useEffect, useState } from "react";
import * as storage from "../lib/storage";

export default function PalletsPage() {
  const [pallets, setPallets] = useState<storage.PalletItem[]>([]);

  function reload() {
    setPallets(storage.getPallets());
  }

  useEffect(() => {
    reload();
  }, []);

  // Funzioni per aggiungere/modificare/eliminare pallet (da completare secondo la tua logica)
  // ...

  async function exportPdf() {
    const all = storage.getPallets();
    await storage.exportPdf({
      filename: "pallet.pdf",
      title: "Elenco Pallet",
      headers: ["ID", "Codice", "Codice alternativo", "Tipo", "Note", "Ultimo visto"],
      rows: all.map((p) => [
        p.id,
        p.code,
        p.altCode || "",
        p.type || "",
        p.notes || "",
        p.lastSeenTs ? new Date(p.lastSeenTs).toLocaleString() : "",
      ]),
    });
  }

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
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
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Gestione Pallet</h1>
      <div style={{ opacity: 0.85, fontWeight: 700 }}>
        Gestisci i pallet e scansioni QR.
      </div>

      <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>➕ Nuovo Pallet / Scansione</h2>
        {/* Qui metti il form per aggiungere pallet o il pulsante per scansione */}
        <p>Funzione di scansione QR (da implementare).</p>
        <button onClick={exportPdf} style={btn("#9c27b0")}>
          📄 Export PDF
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco Pallet</h2>
        {pallets.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun pallet inserito.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pallets.map((p) => (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900, fontSize: 18 }}>{p.code}</div>
                <div style={{ opacity: 0.75 }}>{p.type && `Tipo: ${p.type}`}</div>
                {p.notes && <div style={{ opacity: 0.7 }}>📝 {p.notes}</div>}
              </div>
            ))}
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
