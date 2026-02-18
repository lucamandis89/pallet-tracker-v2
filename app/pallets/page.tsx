"use client";

import React, { useEffect, useState, useRef } from "react";
import * as storage from "../lib/storage";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function PalletsPage() {
  const [pallets, setPallets] = useState<storage.PalletItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [foundPallet, setFoundPallet] = useState<storage.PalletItem | null>(null);
  const [form, setForm] = useState({
    code: "",
    altCode: "",
    type: "",
    typeCustom: "",
    notes: "",
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = "qr-reader";

  function reload() {
    setPallets(storage.getPallets());
  }

  useEffect(() => {
    reload();
  }, []);

  // Avvia lo scanner
  const startScanner = () => {
    setShowScanner(true);
    setScanResult(null);
    setFoundPallet(null);

    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          scannerContainerId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scannerRef.current.render(
          (decodedText) => handleScan(decodedText),
          (error) => console.warn("Scan error:", error)
        );
      }
    }, 100);
  };

  const handleScan = (code: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScanResult(code);
    const pallet = storage.findPalletByCode(code);
    setFoundPallet(pallet);
    if (pallet) {
      // Precompila il form con i dati del pallet trovato
      setForm({
        code: pallet.code,
        altCode: pallet.altCode || "",
        type: pallet.type || "",
        typeCustom: pallet.typeCustom || "",
        notes: pallet.notes || "",
      });
    } else {
      // Nuovo pallet: preimposta il codice
      setForm({ ...form, code });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const createPalletFromScan = () => {
    if (!scanResult) return;
    const newPallet = storage.upsertPallet(
      { code: scanResult },
      undefined // companyId (non ancora implementato)
    );
    reload();
    setScanResult(null);
    setFoundPallet(newPallet);
    alert(`Pallet ${scanResult} creato.`);
  };

  const savePallet = () => {
    if (!form.code.trim()) {
      alert("Inserisci il codice del pallet");
      return;
    }

    const palletData: Partial<storage.PalletItem> & { code: string } = {
      code: form.code.trim(),
      altCode: form.altCode.trim() || undefined,
      type: (form.type as storage.PalletType) || undefined,
      typeCustom: form.type === "ALTRO" ? form.typeCustom.trim() : undefined,
      notes: form.notes.trim() || undefined,
      lastSeenTs: Date.now(),
    };

    storage.upsertPallet(palletData);
    reload();
    resetForm();
    alert("Pallet salvato!");
  };

  const resetForm = () => {
    setForm({
      code: "",
      altCode: "",
      type: "",
      typeCustom: "",
      notes: "",
    });
    setScanResult(null);
    setFoundPallet(null);
  };

  const editPallet = (pallet: storage.PalletItem) => {
    setFoundPallet(pallet);
    setForm({
      code: pallet.code,
      altCode: pallet.altCode || "",
      type: pallet.type || "",
      typeCustom: pallet.typeCustom || "",
      notes: pallet.notes || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePallet = (id: string) => {
    if (!confirm("Eliminare questo pallet?")) return;
    const items = storage.getPallets().filter((p) => p.id !== id);
    storage.setPallets(items);
    reload();
    if (foundPallet?.id === id) resetForm();
  };

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
        p.type === "ALTRO" && p.typeCustom ? p.typeCustom : p.type || "",
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
    marginRight: 8,
    marginBottom: 8,
  });

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
    marginBottom: 10,
  };

  // Icone per le tipologie (emoji)
  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      "CHEP": "🔵",
      "LPR": "💗",
      "EPAL": "🟫",
      "DUSS CHEP": "🔵⚙️",
      "DUSS LPR": "💗⚙️",
      "MINI PALLET DUSS": "📦⚙️",
      "GENERICHE": "📦",
      "IFCO VERDI": "🟢",
      "IFCO ROSSE": "🔴",
      "IFCO MARRONI": "🟤",
      "ROLL": "🛒",
    };
    return icons[type] || "📦";
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Gestione Pallet</h1>
      <div style={{ opacity: 0.85, fontWeight: 700 }}>
        Gestisci i pallet e scansioni QR.
      </div>

      {/* Scanner overlay */}
      {showScanner && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ background: "white", borderRadius: 16, padding: 20, maxWidth: 500, width: "100%" }}>
            <h2 style={{ marginTop: 0 }}>📷 Inquadra il QR code</h2>
            <div id={scannerContainerId} style={{ width: "100%", minHeight: 300 }} />
            <button onClick={stopScanner} style={btn("#e53935")}>
              Chiudi scanner
            </button>
          </div>
        </div>
      )}

      {/* Risultato scansione */}
      {scanResult && !showScanner && (
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
          <h3>Codice scansionato: {scanResult}</h3>
          {foundPallet ? (
            <div>
              <p>✅ Pallet esistente trovato</p>
              <button
                onClick={() => {
                  setForm({
                    code: foundPallet.code,
                    altCode: foundPallet.altCode || "",
                    type: foundPallet.type || "",
                    typeCustom: foundPallet.typeCustom || "",
                    notes: foundPallet.notes || "",
                  });
                  setScanResult(null);
                }}
                style={btn("#ffb300", "#111")}
              >
                Modifica
              </button>
            </div>
          ) : (
            <div>
              <p>❌ Nessun pallet trovato con questo codice.</p>
              <button onClick={createPalletFromScan} style={btn("#2e7d32")}>
                Crea nuovo pallet
              </button>
            </div>
          )}
          <button onClick={() => setScanResult(null)} style={btn("#eeeeee", "#111")}>
            Chiudi
          </button>
        </div>
      )}

      {/* Form di inserimento/modifica */}
      <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>
          {foundPallet ? "✏️ Modifica Pallet" : "➕ Nuovo Pallet"}
        </h2>

        <input
          placeholder="Codice pallet *"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          style={inputStyle}
        />

        <input
          placeholder="Codice alternativo"
          value={form.altCode}
          onChange={(e) => setForm({ ...form, altCode: e.target.value })}
          style={inputStyle}
        />

        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value, typeCustom: "" })}
          style={inputStyle}
        >
          <option value="">Seleziona tipo</option>
          <optgroup label="CHEP">
            <option value="CHEP">{getTypeIcon("CHEP")} CHEP</option>
          </optgroup>
          <optgroup label="LPR">
            <option value="LPR">{getTypeIcon("LPR")} LPR</option>
          </optgroup>
          <optgroup label="EPAL">
            <option value="EPAL">{getTypeIcon("EPAL")} EPAL</option>
          </optgroup>
          <optgroup label="DUSS">
            <option value="DUSS CHEP">{getTypeIcon("DUSS CHEP")} DUSS CHEP</option>
            <option value="DUSS LPR">{getTypeIcon("DUSS LPR")} DUSS LPR</option>
            <option value="MINI PALLET DUSS">{getTypeIcon("MINI PALLET DUSS")} Mini pallet DUSS</option>
          </optgroup>
          <optgroup label="IFCO">
            <option value="IFCO VERDI">{getTypeIcon("IFCO VERDI")} IFCO verdi</option>
            <option value="IFCO ROSSE">{getTypeIcon("IFCO ROSSE")} IFCO rosse</option>
            <option value="IFCO MARRONI">{getTypeIcon("IFCO MARRONI")} IFCO marroni</option>
          </optgroup>
          <optgroup label="Altri">
            <option value="ROLL">{getTypeIcon("ROLL")} ROLL</option>
            <option value="GENERICHE">{getTypeIcon("GENERICHE")} Generiche</option>
            <option value="ALTRO">📌 Altro (specificare)</option>
          </optgroup>
        </select>

        {form.type === "ALTRO" && (
          <input
            placeholder="Specifica tipo"
            value={form.typeCustom}
            onChange={(e) => setForm({ ...form, typeCustom: e.target.value })}
            style={inputStyle}
          />
        )}

        <textarea
          placeholder="Note"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          style={{ ...inputStyle, minHeight: 80 }}
        />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={savePallet} style={btn("#1e88e5")}>
            {foundPallet ? "Salva modifiche" : "Aggiungi pallet"}
          </button>
          <button onClick={resetForm} style={btn("#eeeeee", "#111")}>
            Annulla
          </button>
          <button onClick={startScanner} style={btn("#d32f2f")}>
            📷 Avvia scansione QR
          </button>
          <button onClick={exportPdf} style={btn("#9c27b0")}>
            📄 Export PDF
          </button>
        </div>
      </div>

      {/* Elenco pallet */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>📋 Elenco Pallet</h2>
        {pallets.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun pallet inserito.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {pallets.map((p) => (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {getTypeIcon(p.type || "")} {p.code}
                    </div>
                    <div style={{ opacity: 0.75 }}>
                      Tipo: {p.type === "ALTRO" && p.typeCustom ? p.typeCustom : p.type || "Non specificato"}
                    </div>
                    {p.altCode && <div style={{ opacity: 0.6 }}>Alt: {p.altCode}</div>}
                    {p.notes && <div style={{ opacity: 0.7 }}>📝 {p.notes}</div>}
                    {p.lastSeenTs && (
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Ultimo visto: {new Date(p.lastSeenTs).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => editPallet(p)} style={btn("#ffb300", "#111", true)}>
                      Modifica
                    </button>
                    <button onClick={() => deletePallet(p.id)} style={btn("#e53935", "white", true)}>
                      Elimina
                    </button>
                  </div>
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

// Versione compatta per i bottoni nell'elenco
const btn = (bg: string, color: string, small?: boolean) => ({
  padding: small ? "6px 10px" : "12px 14px",
  borderRadius: 14,
  border: "none",
  fontWeight: 900 as const,
  cursor: "pointer",
  background: bg,
  color,
});
