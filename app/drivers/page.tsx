"use client";

import React, { useEffect, useMemo, useState } from "react";
import { addDriver, downloadCsv, getDrivers, removeDriver, updateDriver, DriverItem } from "../lib/storage";

async function getMyPosition(): Promise<{ lat: number; lng: number; accuracy?: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("no geo"));

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  });
}

export default function DriversPage() {
  const [items, setItems] = useState<DriverItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const emptyForm = useMemo(
    () => ({
      name: "",
      phone: "",
      address: "",
      lat: "",
      lng: "",
      notes: "",
    }),
    []
  );

  const [form, setForm] = useState<any>(emptyForm);
  const [msg, setMsg] = useState<string>("");

  function reload() {
    setItems(getDrivers());
  }

  useEffect(() => {
    reload();
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMsg("");
  }

  function startEdit(it: DriverItem) {
    setEditingId(it.id);
    setForm({
      name: it.name || "",
      phone: it.phone || "",
      address: it.address || "",
      lat: it.lat ?? "",
      lng: it.lng ?? "",
      notes: it.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function del(id: string) {
    if (!confirm("Eliminare questo autista?")) return;
    removeDriver(id);
    reload();
    if (editingId === id) resetForm();
  }

  async function fillMyPosition() {
    setMsg("");
    try {
      const p = await getMyPosition();
      setForm((f: any) => ({ ...f, lat: p.lat, lng: p.lng }));
      setMsg("📍 Posizione inserita.");
    } catch {
      setMsg("❌ GPS non disponibile o permesso negato.");
    }
  }

  function save() {
    setMsg("");

    const name = String(form.name || "").trim();
    if (!name) return alert("Inserisci il nome dell’autista.");

    const phone = String(form.phone || "").trim();
    const address = String(form.address || "").trim();
    const notes = String(form.notes || "").trim();

    const latNum = form.lat === "" ? undefined : Number(form.lat);
    const lngNum = form.lng === "" ? undefined : Number(form.lng);

    if ((latNum !== undefined && Number.isNaN(latNum)) || (lngNum !== undefined && Number.isNaN(lngNum))) {
      return alert("Latitudine/Longitudine non valide.");
    }

    if (editingId) {
      updateDriver(editingId, {
        name,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
        lat: latNum,
        lng: lngNum,
      });
      reload();
      resetForm();
      setMsg("✅ Autista modificato.");
      return;
    }

    try {
      addDriver({
        name,
        phone: phone || undefined,
        address: address || undefined,
        notes: notes || undefined,
        lat: latNum,
        lng: lngNum,
      });
      reload();
      resetForm();
      setMsg("✅ Autista aggiunto.");
    } catch (e: any) {
      if (String(e?.message) === "LIMIT_10") {
        alert("Limite massimo autisti raggiunto: 10");
      } else {
        alert("Errore durante il salvataggio.");
      }
    }
  }

  function exportCsv() {
    const all = getDrivers();
    downloadCsv(
      "autisti.csv",
      ["id", "name", "phone", "address", "lat", "lng", "notes", "createdAt"],
      all.map((d) => [
        d.id,
        d.name,
        d.phone || "",
        d.address || "",
        d.lat ?? "",
        d.lng ?? "",
        d.notes || "",
        new Date(d.createdAt).toISOString(),
      ])
    );
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

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🚚 Gestione Autisti</h1>
      <div style={{ opacity: 0.85, fontWeight: 700 }}>
        Inserisci autisti con contatti e posizione GPS. (Max 10 autisti)
      </div>

      <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>
          {editingId ? "✏️ Modifica Autista" : "➕ Nuovo Autista"}
        </h2>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <input
            placeholder="Nome e Cognome *"
            value={form.name}
            onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))}
            style={{ ...inputStyle, gridColumn: "1 / -1" }}
          />

          <input
            placeholder="Telefono"
            value={form.phone}
            onChange={(e) => setForm((f: any) => ({ ...f, phone: e.target.value }))}
            style={inputStyle}
          />

          <input
            placeholder="Indirizzo"
            value={form.address}
            onChange={(e) => setForm((f: any) => ({ ...f, address: e.target.value }))}
            style={inputStyle}
          />

          <input
            placeholder="Latitudine"
            value={form.lat}
            onChange={(e) => setForm((f: any) => ({ ...f, lat: e.target.value }))}
            style={inputStyle}
            inputMode="decimal"
          />

          <input
            placeholder="Longitudine"
            value={form.lng}
            onChange={(e) => setForm((f: any) => ({ ...f, lng: e.target.value }))}
            style={inputStyle}
            inputMode="decimal"
          />

          <textarea
            placeholder="Note (facoltative)"
            value={form.notes}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            style={{
              ...inputStyle,
              gridColumn: "1 / -1",
              minHeight: 90,
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={save} style={btn("#1e88e5")}>
            {editingId ? "Salva Modifica" : "Aggiungi Autista"}
          </button>

          <button onClick={resetForm} style={btn("#eeeeee", "#111")}>
            Annulla
          </button>

          <button onClick={fillMyPosition} style={btn("#2e7d32")}>
            📍 Usa mia posizione
          </button>

          <button onClick={exportCsv} style={btn("#6a1b9a")}>
            ⬇️ Export CSV
          </button>
        </div>

        {msg ? (
          <div style={{ marginTop: 12, fontWeight: 900, color: msg.includes("❌") ? "#c62828" : "#2e7d32" }}>
            {msg}
          </div>
        ) : null}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco Autisti</h2>

        {items.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun autista inserito.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {items.map((d) => (
              <div key={d.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>{d.name}</div>
                    <div style={{ opacity: 0.85, fontWeight: 700 }}>
                      {d.phone ? `📞 ${d.phone}` : "📞 —"}
                      {d.address ? ` • 📍 ${d.address}` : ""}
                    </div>
                    <div style={{ opacity: 0.75, marginTop: 4, fontWeight: 700 }}>
                      GPS: {d.lat ?? "—"} , {d.lng ?? "—"}
                    </div>
                    {d.notes ? (
                      <div style={{ marginTop: 6, opacity: 0.85, fontWeight: 700 }}>
                        📝 {d.notes}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => startEdit(d)} style={btn("#ffb300", "#111")}>
                      Modifica
                    </button>
                    <button onClick={() => del(d.id)} style={btn("#e53935")}>
                      Elimina
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                  Creato: {new Date(d.createdAt).toLocaleString()}
                </div>
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
