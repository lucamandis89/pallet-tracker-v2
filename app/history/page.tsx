"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as storage from "../lib/storage";

export default function HistoryPage() {
  const [items, setItems] = useState<storage.ScanEvent[]>([]);
  const [msg, setMsg] = useState<string>("");

  const depots = useMemo(() => storage.getDepots(), []);
  const drivers = useMemo(() => storage.getDrivers(), []);
  const shops = useMemo(() => storage.getShops(), []);

  function nameOf(kind?: storage.StockLocationKind, id?: string) {
    if (!kind || !id) return "";
    if (kind === "DEPOSITO") return depots.find((d) => d.id === id)?.name || id;
    if (kind === "AUTISTA") return drivers.find((d) => d.id === id)?.name || id;
    return shops.find((s) => s.id === id)?.name || id;
  }

  function reload() {
    setItems(storage.getHistory());
  }

  useEffect(() => {
    reload();
  }, []);

  function exportHistoryCsv() {
    storage.exportCsv(
      "history.csv",
      [
        "ts",
        "code",
        "source",
        "palletType",
        "qty",
        "declaredKind",
        "declaredId",
        "declaredName",
        "lat",
        "lng",
        "accuracy",
      ],
      items.map((h) => [
        new Date(h.ts).toISOString(),
        h.code,
        h.source || "",
        h.palletType || "",
        h.qty ?? "",
        h.declaredKind || "",
        h.declaredId || "",
        nameOf(h.declaredKind, h.declaredId),
        h.lat ?? "",
        h.lng ?? "",
        h.accuracy ?? "",
      ])
    );
    setMsg("CSV history scaricato ✅");
  }

  async function exportHistoryPdf() {
    await storage.exportPdf({
      filename: "history.pdf",
      title: "Cronologia scansioni",
      headers: ["Data", "Codice", "Tipo", "Qtà", "Luogo", "Precisione"],
      rows: items.map((h) => [
        new Date(h.ts).toLocaleString(),
        h.code,
        h.palletType || "",
        h.qty ?? "",
        `${h.declaredKind || ""} ${nameOf(h.declaredKind, h.declaredId)}`.trim(),
        h.accuracy ?? "",
      ]),
    });
    setMsg("PDF history scaricato ✅");
  }

  const card: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };

  const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    fontWeight: 900,
    cursor: "pointer",
    background: "#2e7d32",
    color: "white",
  };

  const btn2: React.CSSProperties = {
    ...btn,
    background: "#e53935",
  };

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>🕘 History</h1>

      <div style={card}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={exportHistoryCsv} style={btn}>
            ⬇️ Export History CSV
          </button>

          <button onClick={exportHistoryPdf} style={btn2}>
            ⬇️ Export History PDF
          </button>

          <button
            onClick={() => {
              storage.setHistory([]);
              reload();
              setMsg("History svuotata ✅");
            }}
            style={{ ...btn, background: "#455a64" }}
          >
            Svuota history
          </button>
        </div>

        {msg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div> : null}
      </div>

      <div style={{ marginTop: 14, ...card }}>
        <h2 style={{ marginTop: 0 }}>Eventi</h2>

        {items.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun evento.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.slice(0, 60).map((h) => (
              <div key={h.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ fontWeight: 900 }}>
                  {new Date(h.ts).toLocaleString()} — {h.code}
                </div>

                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  {h.palletType ? `Tipo: ${h.palletType}` : "Tipo: —"}{" "}
                  {h.qty !== undefined ? ` • Qtà: ${h.qty}` : ""}
                </div>

                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  Luogo: {h.declaredKind || "—"} {nameOf(h.declaredKind, h.declaredId)}
                </div>

                {h.accuracy !== undefined ? (
                  <div style={{ opacity: 0.85, marginTop: 4 }}>Accuratezza: {h.accuracy}</div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
