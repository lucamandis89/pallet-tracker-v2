"use client";

import React, { useEffect, useMemo, useState } from "react";

type Depot = {
  id: string;
  name: string;
  code?: string;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
  createdAt: number;
};

const LS_KEY = "pallet-tracker:depots:v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function toCsvValue(v: any) {
  const s = v === undefined || v === null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function getMyPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("no geo"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function DepotsPage() {
  const [items, setItems] = useState<Depot[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [geoMsg, setGeoMsg] = useState<string>("");

  const emptyForm = useMemo(
    () => ({ name: "", code: "", address: "", lat: "", lng: "", notes: "" }),
    []
  );
  const [form, setForm] = useState<any>(emptyForm);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(it: Depot) {
    setEditingId(it.id);
    setForm({
      name: it.name || "",
      code: it.code || "",
      address: it.address || "",
      lat: it.lat ?? "",
      lng: it.lng ?? "",
      notes: it.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Eliminare questo deposito?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    if (editingId === id) resetForm();
  }

  async function fillMyPosition() {
    setGeoMsg("");
    try {
      const p = await getMyPosition();
      setForm((f: any) => ({ ...f, lat: p.lat, lng: p.lng }));
      setGeoMsg("📍 Posizione inserita.");
    } catch {
      setGeoMsg("❌ GPS non disponibile o permesso negato.");
    }
  }

  function save() {
    const name = String(form.name || "").trim();
    if (!name) return alert("Inserisci il nome del deposito.");

    const latNum = form.lat === "" ? undefined : Number(form.lat);
    const lngNum = form.lng === "" ? undefined : Number(form.lng);
    if ((latNum !== undefined && Number.isNaN(latNum)) || (lngNum !== undefined && Number.isNaN(lngNum))) {
      return alert("Lat/Lng non validi.");
    }

    const payload = {
      name,
      code: String(form.code || "").trim(),
      address: String(form.address || "").trim(),
      lat: latNum,
      lng: lngNum,
      notes: String(form.notes || "").trim(),
    };

    if (editingId) {
      setItems((prev) => prev.map((x) => (x.id === editingId ? { ...x, ...payload } : x)));
    } else {
      setItems((prev) => [{ id: uid(), createdAt: Date.now(), ...payload }, ...prev]);
    }
    resetForm();
  }

  function exportCsv() {
    const header = ["id", "name", "code", "address", "lat", "lng", "notes", "createdAt"];
    const rows = items.map((x) => [
      x.id,
      x.name,
      x.code ?? "",
      x.address ?? "",
      x.lat ?? "",
      x.lng ?? "",
      x.notes ?? "",
      new Date(x.createdAt).toISOString(),
    ]);
    const csv =
      header.map(toCsvValue).join(",") + "\n" + rows.map((r) => r.map(toCsvValue).join(",")).join("\n");
    downloadTextFile("depositi.csv", csv, "text/csv;charset=utf-8");
  }

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const btn: React.CSSProperties = {
    padding: "12px 14px",
    borderRadius: 14,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🏬 Depositi</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Gestione depositi (hub) con indirizzo e GPS. Dati salvati in locale.
      </p>

      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>
          {editingId ? "✏️ Modifica Deposito" : "➕ Nuovo Deposito"}
        </h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <input
            placeholder="Nome deposito *"
            value={form.name}
            onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Codice deposito (facoltativo)"
            value={form.code}
            onChange={(e) => setForm((f: any) => ({ ...f, code: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <input
            placeholder="Indirizzo"
            value={form.address}
            onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", gridColumn: "1 / -1" }}
          />
          <input
            placeholder="Latitudine"
            value={form.lat}
            onChange={(e) => setForm((f: any) => ({ ...f, lat: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            inputMode="decimal"
          />
          <input
            placeholder="Longitudine"
            value={form.lng}
            onChange={(e) => setForm((f: any) => ({ ...f, lng: e.target.value }))}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
            inputMode="decimal"
          />
          <textarea
            placeholder="Note (facoltative)"
            value={form.notes}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              gridColumn: "1 / -1",
              minHeight: 80,
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={save} style={{ ...btn, background: "#1e88e5", color: "white" }}>
            {editingId ? "Salva Modifica" : "Aggiungi Deposito"}
          </button>
          <button onClick={resetForm} style={{ ...btn, background: "#f1f1f1" }}>
            Annulla
          </button>
          <button onClick={fillMyPosition} style={{ ...btn, background: "#2e7d32", color: "white" }}>
            📍 Usa mia posizione
          </button>
          <button onClick={exportCsv} style={{ ...btn, background: "#6a1b9a", color: "white" }}>
            ⬇️ Export CSV
          </button>
        </div>

        {geoMsg ? <div style={{ marginTop: 10, fontWeight: 800 }}>{geoMsg}</div> : null}
      </div>

      <div style={{ ...cardStyle }}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco Depositi</h2>
        {items.length === 0 ? (
          <p style={{ opacity: 0.8 }}>Nessun deposito inserito.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((it) => (
              <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {it.name} {it.code ? <span style={{ opacity: 0.7 }}>({it.code})</span> : null}
                    </div>
                    <div style={{ opacity: 0.85 }}>{it.address ? `📍 ${it.address}` : "📍 —"}</div>
                    <div style={{ opacity: 0.8, marginTop: 4 }}>
                      GPS: {it.lat ?? "—"} , {it.lng ?? "—"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      onClick={() => startEdit(it)}
                      style={{ padding: "10px 12px", borderRadius: 14, border: "none", fontWeight: 900, background: "#ffb300", cursor: "pointer" }}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => remove(it.id)}
                      style={{ padding: "10px 12px", borderRadius: 14, border: "none", fontWeight: 900, background: "#e53935", color: "white", cursor: "pointer" }}
                    >
                      Elimina
                    </button>
                  </div>
                </div>

                {it.notes ? <div style={{ marginTop: 8, opacity: 0.85 }}>📝 {it.notes}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14 }}>
        <a href="/" style={{ fontWeight: 800 }}>← Torna alla Home</a>
      </div>
    </div>
  );
}
