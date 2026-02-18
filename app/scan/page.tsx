"use client";

import React, { useEffect, useState, useRef } from "react";
import * as storage from "../lib/storage";
import { Html5QrcodeScanner } from "html5-qrcode";
import Link from "next/link";

export default function ScanPage() {
  const [scannerReady, setScannerReady] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerContainerId = "qr-reader";

  // Avvia scanner appena la pagina è pronta
  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        scannerContainerId,
        { fps: 10, qrbox: { width: 280, height: 280 } },
        false
      );

      scannerRef.current.render(
        async (decodedText) => {
          // 1. Feedback sonoro (opzionale)
          try {
            const audio = new Audio("/beep.mp3");
            audio.play();
          } catch (e) {}

          // 2. Ottieni posizione
          let lat, lng, accuracy;
          try {
            const pos = await storage.getCurrentPosition();
            lat = pos.lat;
            lng = pos.lng;
            accuracy = pos.accuracy;
          } catch (err) {
            console.warn("GPS non disponibile");
          }

          // 3. Registra evento di scansione
          storage.addHistory({
            code: decodedText,
            ts: Date.now(),
            lat,
            lng,
            accuracy,
            source: "qr",
          });

          // 4. Aggiorna o crea il pallet con l'ultima posizione
          const existing = storage.findPalletByCode(decodedText);
          if (existing) {
            storage.upsertPallet({
              code: decodedText,
              lastSeenTs: Date.now(),
              lastLat: lat,
              lastLng: lng,
              lastSource: "qr",
            });
          } else {
            storage.upsertPallet({
              code: decodedText,
              lastSeenTs: Date.now(),
              lastLat: lat,
              lastLng: lng,
              lastSource: "qr",
            });
          }

          // 5. Mostra messaggio di conferma enorme
          setMessage({ text: `✅ ${decodedText}`, type: "success" });

          // 6. Dopo 2 secondi, cancella il messaggio
          setTimeout(() => setMessage(null), 2000);
        },
        (error) => {
          // Ignora errori di lettura (continua a scansionare)
        }
      );
      setScannerReady(true);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 500, margin: "0 auto", textAlign: "center" }}>
      <h1 style={{ fontSize: 32, marginBottom: 20 }}>📷 SCANSIONA PEDANA</h1>

      {!scannerReady && <p>Avvio fotocamera...</p>}

      <div id={scannerContainerId} style={{ width: "100%", minHeight: 350 }} />

      {/* Messaggio di conferma enorme */}
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
