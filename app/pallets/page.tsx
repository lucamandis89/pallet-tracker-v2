"use client";

import React, { useEffect, useState, useRef } from "react";
import * as storage from "../lib/storage";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

export default function PalletsPage() {
  const [pallets, setPallets] = useState<storage.PalletItem[]>([]);
  const [filteredPallets, setFilteredPallets] = useState<storage.PalletItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [foundPallet, setFoundPallet] = useState<storage.PalletItem | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [historyEvents, setHistoryEvents] = useState<storage.ScanEvent[]>([]);
  const [showMovements, setShowMovements] = useState<string | null>(null);
  const [movementList, setMovementList] = useState<storage.Movement[]>([]);

  const [form, setForm] = useState({
    code: "",
    altCode: "",
    type: "",
    typeCustom: "",
    notes: "",
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = "qr-reader";

  const typeIcons: Record<string, string> = {
    CHEP: "🔵", LPR: "💗", EPAL: "🟫", "DUSS CHEP": "🔵⚙️", "DUSS LPR": "💗⚙️",
    "MINI PALLET DUSS": "📦⚙️", GENERICHE: "📦", "IFCO VERDI": "🟢", "IFCO ROSSE": "🔴",
    "IFCO MARRONI": "🟤", ROLL: "🛒",
  };

  function reload() {
    const all = storage.getPallets();
    setPallets(all);
    applyFilters(all, searchTerm, filterType);
  }

  function applyFilters(items: storage.PalletItem[], search: string, type: string) {
    let filtered = items;
    if (search.trim()) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.code.toLowerCase().includes(s) || 
        p.altCode?.toLowerCase().includes(s) ||
        p.notes?.toLowerCase().includes(s)
      );
    }
    if (type) {
      filtered = filtered.filter(p => p.type === type);
    }
    setFilteredPallets(filtered);
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    applyFilters(pallets, searchTerm, filterType);
  }, [searchTerm, filterType, pallets]);

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

  const handleScan = async (code: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScanResult(code);

    let lat, lng, accuracy, address;
    try {
      const pos = await storage.getCurrentPosition();
      lat = pos.lat;
      lng = pos.lng;
      accuracy = pos.accuracy;
      // Ottieni il nome del luogo dalle coordinate
      address = await storage.reverseGeocodeWithRateLimit(lat, lng);
    } catch (err) {
      console.warn("Posizione non disponibile", err);
    }

    storage.addHistory({
      code,
      ts: Date.now(),
      lat,
      lng,
      accuracy,
      address,
      source: "qr",
    });

    const pallet = storage.findPalletByCode(code);
    if (pallet) {
      storage.upsertPallet({
        code,
        lastSeenTs: Date.now(),
        lastLat: lat,
        lastLng: lng,
        lastAddress: address,
        lastSource: "qr",
      });
      setFoundPallet(pallet);
      setForm({
        code: pallet.code,
        altCode: pallet.altCode || "",
        type: pallet.type || "",
        typeCustom: pallet.typeCustom || "",
        notes: pallet.notes || "",
      });
    } else {
      setFoundPallet(null);
      setForm({ ...form, code });
    }
    reload();
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
    storage.upsertPallet({ code: scanResult, lastSeenTs: Date.now() });
    reload();
    setScanResult(null);
    setFoundPallet(null);
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
    };
    storage.upsertPallet(palletData);
    reload();
    resetForm();
    alert("Pallet salvato!");
  };

  const resetForm = () => {
    setForm({ code: "", altCode: "", type: "", typeCustom: "", notes: "" });
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
    storage.deletePallet(id);
    reload();
    if (foundPallet?.id === id) resetForm();
  };

  const viewHistory = (code: string) => {
    const events = storage.getHistoryForPallet(code);
    setHistoryEvents(events);
    setShowHistory(code);
  };

  const viewMovements = (code: string) => {
    const moves = storage.getMovementsForPallet(code);
    setMovementList(moves);
    setShowMovements(code);
  };

  async function exportPdf() {
    await storage.exportPdf({
      filename: "pallet.pdf",
      title: "Elenco Pallet",
      headers: ["Codice", "Tipo", "Note", "Ultimo avvistamento", "Posizione", "Luogo"],
      rows: filteredPallets.map((p) => [
        p.code,
        p.type === "ALTRO" && p.typeCustom ? p.typeCustom : p.type || "",
        p.notes || "",
        p.lastSeenTs ? new Date(p.lastSeenTs).toLocaleString() : "Mai",
        p.lastLat && p.lastLng ? `${p.lastLat.toFixed(6)}, ${p.lastLng.toFixed(6)}` : "N/D",
        p.lastAddress || "N/D",
      ]),
    });
  }

  const isLost = (lastSeenTs?: number): boolean => {
    if (!lastSeenTs) return true;
    const daysDiff = (Date.now() - lastSeenTs) / (1000 * 60 * 60 * 24);
    return daysDiff > 30;
  };

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const btn = (bg: string, color = "white", small?: boolean) => ({
    padding: small ? "6px 10px" : "12px 14px",
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

  const modalStyle: React.CSSProperties = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 2000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  };

  const modalContentStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: 20,
    maxWidth: 500,
    width: "100%",
    maxHeight: "80vh",
    overflowY: "auto",
  };

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>📦 Gestione Pallet</h1>
      <div style={{ opacity: 0.85, fontWeight: 700, marginBottom: 16 }}>
        {pallets.length} pedane totali • {filteredPallets.length} visualizzate
      </div>

      {/* Filtri e ricerca */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            placeholder="🔍 Cerca per codice, altCode, note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ ...inputStyle, flex: 2, marginBottom: 0 }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
          >
            <option value="">Tutti i tipi</option>
            <option value="CHEP">CHEP</option>
            <option value="LPR">LPR</option>
            <option value="EPAL">EPAL</option>
            <option value="DUSS CHEP">DUSS CHEP</option>
            <option value="DUSS LPR">DUSS LPR</option>
            <option value="MINI PALLET DUSS">Mini pallet DUSS</option>
            <option value="GENERICHE">Generiche</option>
            <option value="IFCO VERDI">IFCO verdi</option>
            <option value="IFCO ROSSE">IFCO rosse</option>
            <option value="IFCO MARRONI">IFCO marroni</option>
            <option value="ROLL">ROLL</option>
            <option value="ALTRO">Altro</option>
          </select>
        </div>
      </div>

      {/* Scanner overlay */}
      {showScanner && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
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
              <button onClick={() => editPallet(foundPallet)} style={btn("#ffb300", "#111")}>
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
            <option value="CHEP">{typeIcons.CHEP} CHEP</option>
          </optgroup>
          <optgroup label="LPR">
            <option value="LPR">{typeIcons.LPR} LPR</option>
          </optgroup>
          <optgroup label="EPAL">
            <option value="EPAL">{typeIcons.EPAL} EPAL</option>
          </optgroup>
          <optgroup label="DUSS">
            <option value="DUSS CHEP">{typeIcons["DUSS CHEP"]} DUSS CHEP</option>
            <option value="DUSS LPR">{typeIcons["DUSS LPR"]} DUSS LPR</option>
            <option value="MINI PALLET DUSS">{typeIcons["MINI PALLET DUSS"]} Mini pallet DUSS</option>
          </optgroup>
          <optgroup label="IFCO">
            <option value="IFCO VERDI">{typeIcons["IFCO VERDI"]} IFCO verdi</option>
            <option value="IFCO ROSSE">{typeIcons["IFCO ROSSE"]} IFCO rosse</option>
            <option value="IFCO MARRONI">{typeIcons["IFCO MARRONI"]} IFCO marroni</option>
          </optgroup>
          <optgroup label="Altri">
            <option value="ROLL">{typeIcons.ROLL} ROLL</option>
            <option value="GENERICHE">{typeIcons.GENERICHE} Generiche</option>
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
        {filteredPallets.length === 0 ? (
          <div style={{ opacity: 0.8 }}>Nessun pallet trovato.</div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {filteredPallets.map((p) => (
              <div key={p.id} style={{ border: "1px solid #eee", borderRadius: 14, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 18 }}>
                      {typeIcons[p.type as keyof typeof typeIcons] || "📦"} {p.code}
                      {isLost(p.lastSeenTs) && <span style={{ marginLeft: 8, color: "#d32f2f" }}>⚠️ Perso</span>}
                    </div>
                    <div style={{ opacity: 0.75 }}>
                      Tipo: {p.type === "ALTRO" && p.typeCustom ? p.typeCustom : p.type || "Non specificato"}
                    </div>
                    {p.altCode && <div style={{ opacity: 0.6 }}>Alt: {p.altCode}</div>}
                    {p.notes && <div style={{ opacity: 0.7 }}>📝 {p.notes}</div>}
                    {p.lastSeenTs && (
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        📅 {new Date(p.lastSeenTs).toLocaleString()}
                        {p.lastLat && p.lastLng && ` 📍 (${p.lastLat.toFixed(6)}, ${p.lastLng.toFixed(6)})`}
                      </div>
                    )}
                    {/* Aggiunto indirizzo */}
                    {p.lastAddress && (
                      <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                        🏠 {p.lastAddress}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => editPallet(p)} style={btn("#ffb300", "#111", true)}>
                      Modifica
                    </button>
                    <button onClick={() => deletePallet(p.id)} style={btn("#e53935", "white", true)}>
                      Elimina
                    </button>
                    <button onClick={() => viewHistory(p.code)} style={btn("#1e88e5", "white", true)}>
                      Storico
                    </button>
                    <button onClick={() => viewMovements(p.code)} style={btn("#9c27b0", "white", true)}>
                      Movimenti
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal storico scansioni */}
      {showHistory && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>📜 Storico scansioni - {showHistory}</h3>
            {historyEvents.length === 0 ? (
              <p>Nessuna scansione precedente.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {historyEvents.map((e) => (
                  <li key={e.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
                    <div>🕒 {new Date(e.ts).toLocaleString()}</div>
                    {e.lat && e.lng && <div>📍 {e.lat.toFixed(6)}, {e.lng.toFixed(6)}</div>}
                    {e.address && <div>🏠 {e.address}</div>}
                    <div style={{ fontSize: 12, opacity: 0.7 }}>Fonte: {e.source}</div>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowHistory(null)} style={btn("#eeeeee", "#111")}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Modal movimenti */}
      {showMovements && (
        <div style={modalStyle}>
          <div style={modalContentStyle}>
            <h3>🚚 Movimenti - {showMovements}</h3>
            {movementList.length === 0 ? (
              <p>Nessun movimento registrato.</p>
            ) : (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {movementList.map((m) => (
                  <li key={m.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
                    <div>🕒 {new Date(m.ts).toLocaleString()}</div>
                    <div>📦 Da: {m.fromName} ({m.fromKind})</div>
                    <div>📦 A: {m.toName} ({m.toKind})</div>
                    {m.note && <div>📝 {m.note}</div>}
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => setShowMovements(null)} style={btn("#eeeeee", "#111")}>
              Chiudi
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
