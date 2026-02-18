"use client";

import React, { useEffect, useState, useRef } from "react";
import * as storage from "../lib/storage";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

export default function ScanPage() {
  const [scannerReady, setScannerReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movementData, setMovementData] = useState({
    fromKind: "" as storage.StockLocationKind | "",
    fromId: "",
    toKind: "" as storage.StockLocationKind | "",
    toId: "",
    note: "",
  });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = "qr-reader";

  // Liste per selettori
  const [depots, setDepots] = useState<storage.DepotItem[]>([]);
  const [shops, setShops] = useState<storage.ShopItem[]>([]);
  const [drivers, setDrivers] = useState<storage.DriverItem[]>([]);

  // Carica le liste
  useEffect(() => {
    setDepots(storage.getDepots());
    setShops(storage.getShops());
    setDrivers(storage.getDrivers());
  }, []);

  // Avvia scanner
  useEffect(() => {
    if (!scannerRef.current && !showManualInput) {
      scannerRef.current = new Html5QrcodeScanner(
        scannerContainerId,
        { fps: 10, qrbox: { width: 280, height: 280 } },
        false
      );

      scannerRef.current.render(
        (decodedText) => handleCode(decodedText),
        (error) => console.warn("Scan error:", error)
      );
      setScannerReady(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [showManualInput]);

  const handleCode = async (code: string) => {
    // Ferma scanner
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScannerReady(false);

    // Ottieni posizione
    let lat, lng, accuracy;
    try {
      const pos = await storage.getCurrentPosition();
      lat = pos.lat;
      lng = pos.lng;
      accuracy = pos.accuracy;
    } catch (err) {
      console.warn("GPS non disponibile");
    }

    // Registra scansione
    storage.addHistory({
      code,
      ts: Date.now(),
      lat,
      lng,
      accuracy,
      source: "qr",
    });

    // Aggiorna o crea pallet
    const existing = storage.findPalletByCode(code);
    if (existing) {
      storage.upsertPallet({
        code,
        lastSeenTs: Date.now(),
        lastLat: lat,
        lastLng: lng,
        lastSource: "qr",
      });
    } else {
      storage.upsertPallet({
        code,
        lastSeenTs: Date.now(),
        lastLat: lat,
        lastLng: lng,
        lastSource: "qr",
      });
    }

    // Mostra form movimento
    setScanResult(code);
    setShowMovementForm(true);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleCode(manualCode.trim());
    setShowManualInput(false);
    setManualCode("");
  };

  const registerMovement = () => {
    if (!movementData.fromKind || !movementData.fromId || !movementData.toKind || !movementData.toId) {
      alert("Seleziona origine e destinazione");
      return;
    }

    // Ottieni nomi
    let fromName = "", toName = "";
    if (movementData.fromKind === "DEPOSITO") {
      fromName = depots.find(d => d.id === movementData.fromId)?.name || "";
    } else if (movementData.fromKind === "NEGOZIO") {
      fromName = shops.find(s => s.id === movementData.fromId)?.name || "";
    } else if (movementData.fromKind === "AUTISTA") {
      fromName = drivers.find(d => d.id === movementData.fromId)?.name || "";
    }

    if (movementData.toKind === "DEPOSITO") {
      toName = depots.find(d => d.id === movementData.toId)?.name || "";
    } else if (movementData.toKind === "NEGOZIO") {
      toName = shops.find(s => s.id === movementData.toId)?.name || "";
    } else if (movementData.toKind === "AUTISTA") {
      toName = drivers.find(d => d.id === movementData.toId)?.name || "";
    }

    // Crea movimento
    storage.addMovement({
      palletCode: scanResult!,
      fromKind: movementData.fromKind as storage.StockLocationKind,
      fromId: movementData.fromId,
      fromName,
      toKind: movementData.toKind as storage.StockLocationKind,
      toId: movementData.toId,
      toName,
      quantity: 1,
      note: movementData.note,
    });

    // Messaggio di conferma
    setMessage({ text: `✅ Movimento registrato`, type: "success" });
    setTimeout(() => setMessage(null), 2000);

    // Reset e ritorno alla scansione
    setShowMovementForm(false);
    setScanResult(null);
    setMovementData({ fromKind: "", fromId: "", toKind: "", toId: "", note: "" });
  };

  return (
    <div style={{ padding: 16, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>📷 SCANSIONA PEDANA</h1>

      {!showMovementForm && (
        <>
          {!showManualInput ? (
            <>
              <div id={scannerContainerId} style={{ width: "100%", minHeight: 350 }} />
              <button
                onClick={() => setShowManualInput(true)}
                style={{
                  marginTop: 20,
                  padding: "16px",
                  background: "#ffb300",
                  color: "#111",
                  border: "none",
                  borderRadius: 30,
                  fontWeight: "bold",
                  fontSize: 18,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                ⌨️ Inserisci codice manualmente
              </button>
            </>
          ) : (
            <form onSubmit={handleManualSubmit} style={{ marginTop: 20 }}>
              <input
                type="text"
                placeholder="Codice pedana"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                style={{
                  padding: 16,
                  fontSize: 18,
                  borderRadius: 30,
                  border: "2px solid #ddd",
                  width: "100%",
                  marginBottom: 10,
                }}
                autoFocus
              />
              <button
                type="submit"
                style={{
                  padding: "16px",
                  background: "#2e7d32",
                  color: "white",
                  border: "none",
                  borderRadius: 30,
                  fontWeight: "bold",
                  fontSize: 18,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                Conferma
              </button>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                style={{
                  marginTop: 10,
                  padding: "12px",
                  background: "#eeeeee",
                  color: "#111",
                  border: "none",
                  borderRadius: 30,
                  fontWeight: "bold",
                  fontSize: 16,
                  width: "100%",
                  cursor: "pointer",
                }}
              >
                Annulla
              </button>
            </form>
          )}
        </>
      )}

      {/* Form movimento */}
      {showMovementForm && scanResult && (
        <div style={{ marginTop: 20, textAlign: "left" }}>
          <h3>Registra movimento per {scanResult}</h3>

          <label style={{ fontWeight: 700, display: "block", marginTop: 10 }}>Origine</label>
          <select
            value={movementData.fromKind}
            onChange={(e) => setMovementData({ ...movementData, fromKind: e.target.value as any, fromId: "" })}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", marginBottom: 10 }}
          >
            <option value="">Seleziona origine</option>
            <option value="DEPOSITO">Deposito</option>
            <option value="NEGOZIO">Negozio</option>
            <option value="AUTISTA">Autista</option>
          </select>

          {movementData.fromKind && (
            <select
              value={movementData.fromId}
              onChange={(e) => setMovementData({ ...movementData, fromId: e.target.value })}
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", marginBottom: 10 }}
            >
              <option value="">Seleziona {movementData.fromKind}</option>
              {movementData.fromKind === "DEPOSITO" &&
                depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              {movementData.fromKind === "NEGOZIO" &&
                shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {movementData.fromKind === "AUTISTA" &&
                drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <label style={{ fontWeight: 700, display: "block", marginTop: 10 }}>Destinazione</label>
          <select
            value={movementData.toKind}
            onChange={(e) => setMovementData({ ...movementData, toKind: e.target.value as any, toId: "" })}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", marginBottom: 10 }}
          >
            <option value="">Seleziona destinazione</option>
            <option value="DEPOSITO">Deposito</option>
            <option value="NEGOZIO">Negozio</option>
            <option value="AUTISTA">Autista</option>
          </select>

          {movementData.toKind && (
            <select
              value={movementData.toId}
              onChange={(e) => setMovementData({ ...movementData, toId: e.target.value })}
              style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", marginBottom: 10 }}
            >
              <option value="">Seleziona {movementData.toKind}</option>
              {movementData.toKind === "DEPOSITO" &&
                depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              {movementData.toKind === "NEGOZIO" &&
                shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              {movementData.toKind === "AUTISTA" &&
                drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}

          <textarea
            placeholder="Note (opzionali)"
            value={movementData.note}
            onChange={(e) => setMovementData({ ...movementData, note: e.target.value })}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd", width: "100%", minHeight: 80, marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={registerMovement}
              style={{ padding: "12px", background: "#1e88e5", color: "white", border: "none", borderRadius: 30, flex: 1, fontWeight: "bold" }}
            >
              Registra
            </button>
            <button
              onClick={() => {
                setShowMovementForm(false);
                setScanResult(null);
                setMovementData({ fromKind: "", fromId: "", toKind: "", toId: "", note: "" });
              }}
              style={{ padding: "12px", background: "#eeeeee", color: "#111", border: "none", borderRadius: 30, flex: 1, fontWeight: "bold" }}
            >
              Salta
            </button>
          </div>
        </div>
      )}

      {/* Messaggio di conferma */}
      {message && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: 20,
            right: 20,
            background: message.type === "success" ? "#2e7d32" : "#c62828",
            color: "white",
            padding: "30px",
            borderRadius: "30px",
            fontSize: "32px",
            fontWeight: "bold",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            zIndex: 2000,
          }}
        >
          {message.text}
        </div>
      )}

      <div style={{ marginTop: 30 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            padding: "16px 32px",
            background: "#f5f5f5",
            color: "#333",
            textDecoration: "none",
            borderRadius: 50,
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          ← TORNA AL MENU
        </Link>
      </div>
    </div>
  );
}
