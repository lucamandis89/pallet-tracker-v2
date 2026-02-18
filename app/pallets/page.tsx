"use client";

import React, { useEffect, useState, useRef } from "react";
import * as storage from "../lib/storage";
import { Html5QrcodeScanner } from "html5-qrcode";

export default function PalletsPage() {
  const [pallets, setPallets] = useState<storage.PalletItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [foundPallet, setFoundPallet] = useState<storage.PalletItem | null>(null);
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

    // Piccolo ritardo per garantire che il DOM sia pronto
    setTimeout(() => {
      if (!scannerRef.current) {
        scannerRef.current = new Html5QrcodeScanner(
          scannerContainerId,
          { fps: 10, qrbox: { width: 250, height: 250 } },
          /* verbose= */ false
        );

        scannerRef.current.render(
          (decodedText) => {
            // Successo
            handleScan(decodedText);
          },
          (error) => {
            // Ignora errori di lettura (continua a scansionare)
            console.warn("Scan error:", error);
          }
        );
      }
    }, 100);
  };

  // Gestisce il codice letto
  const handleScan = (code: string) => {
    if (scannerRef.current) {
      scannerRef.current.clear(); // ferma lo scanner
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScanResult(code);

    // Cerca il pallet per codice
    const pallet = storage.findPalletByCode(code);
    setFoundPallet(pallet);
  };

  // Ferma lo scanner manualmente
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  // Crea un nuovo pallet con il codice scansionato
  const createPalletFromScan = () => {
    if (!scanResult) return;
    const newPallet = storage.upsertPallet({ code: scanResult }); // crea o aggiorna
    reload();
    setScanResult(null);
    setFoundPallet(newPallet);
    alert(`Pallet ${scanResult} creato.`);
  };

  // Esportazione PDF
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
    marginRight: 8,
  });

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
      {scanResult && (
        <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
          <h3>Codice scansionato: {scanResult}</h3>
          {foundPallet ? (
            <div>
              <p>✅ Pallet esistente trovato:</p>
              <pre>{JSON.stringify(foundPallet, null, 2)}</pre>
              <button
                onClick={() => {
                  // Qui potresti navigare a una pagina di modifica o mostrare dettagli
                  alert("Vai alla modifica (da implementare)");
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

      {/* Area principale */}
      <div style={{ ...cardStyle, marginTop: 14, marginBottom: 14 }}>
        <h2 style={{ marginTop: 0, marginBottom: 10 }}>➕ Nuovo Pallet / Scansione</h2>
        <button onClick={startScanner} style={btn("#d32f2f")}>
          📷 Avvia scansione QR
        </button>
        <button onClick={exportPdf} style={btn("#9c27b0")}>
          📄 Export PDF
        </button>
        {/* Qui puoi aggiungere un form per inserimento manuale */}
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
                {p.lastSeenTs && (
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    Ultimo visto: {new Date(p.lastSeenTs).toLocaleString()}
                  </div>
                )}
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
