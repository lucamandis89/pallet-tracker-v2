"use client";

import React, { useState } from "react";
import * as storage from "../lib/storage";
import QRCode from "qrcode.react";
import Link from "next/link";

const palletTypes: storage.PalletType[] = [
  "CHEP",
  "LPR",
  "EPAL",
  "DUSS CHEP",
  "DUSS LPR",
  "MINI PALLET DUSS",
  "GENERICHE",
  "IFCO VERDI",
  "IFCO ROSSE",
  "IFCO MARRONI",
  "ROLL",
  "ALTRO",
];

export default function QrGeneratorPage() {
  const [selectedType, setSelectedType] = useState<storage.PalletType>("CHEP");
  const [customType, setCustomType] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [generatedPallet, setGeneratedPallet] = useState<storage.PalletItem | null>(null);

  const generateQR = () => {
    const finalType = selectedType === "ALTRO" ? "ALTRO" : selectedType;
    const code = storage.generatePalletCode(finalType);
    setGeneratedCode(code);

    // Crea il pallet (non ancora salvato, solo per anteprima)
    const newPallet: storage.PalletItem = {
      id: "temp",
      code,
      type: finalType,
      typeCustom: selectedType === "ALTRO" ? customType : undefined,
    };
    setGeneratedPallet(newPallet);
  };

  const savePallet = () => {
    if (!generatedCode) return;
    storage.upsertPallet({
      code: generatedCode,
      type: generatedPallet?.type,
      typeCustom: generatedPallet?.typeCustom,
    });
    alert(`Pallet ${generatedCode} salvato!`);
    setGeneratedCode("");
    setGeneratedPallet(null);
  };

  const typeIcons: Record<string, string> = {
    CHEP: "🔵", LPR: "💗", EPAL: "🟫", "DUSS CHEP": "🔵⚙️", "DUSS LPR": "💗⚙️",
    "MINI PALLET DUSS": "📦⚙️", GENERICHE: "📦", "IFCO VERDI": "🟢", "IFCO ROSSE": "🔴",
    "IFCO MARRONI": "🟤", ROLL: "🛒",
  };

  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const inputStyle: React.CSSProperties = {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #ddd",
    width: "100%",
    fontWeight: 700,
    marginBottom: 10,
  };

  return (
    <div style={{ padding: 16, maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>🖨️ Genera QR Pedana</h1>
      <div style={{ opacity: 0.85, fontWeight: 700, marginBottom: 20 }}>
        Seleziona il tipo e genera un codice univoco.
      </div>

      <div style={cardStyle}>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as storage.PalletType)}
          style={inputStyle}
        >
          {palletTypes.map((t) => (
            <option key={t} value={t}>
              {typeIcons[t] || "📦"} {t}
            </option>
          ))}
        </select>

        {selectedType === "ALTRO" && (
          <input
            type="text"
            placeholder="Specifica tipo"
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            style={inputStyle}
          />
        )}

        <button
          onClick={generateQR}
          style={{
            padding: "14px",
            background: "#1e88e5",
            color: "white",
            border: "none",
            borderRadius: 30,
            fontWeight: "bold",
            fontSize: 18,
            width: "100%",
            cursor: "pointer",
            marginBottom: 20,
          }}
        >
          Genera QR
        </button>

        {generatedCode && (
          <div style={{ textAlign: "center" }}>
            <h3>Codice: {generatedCode}</h3>
            <div style={{ background: "white", padding: 20, display: "inline-block", borderRadius: 16 }}>
              <QRCode value={generatedCode} size={200} />
            </div>
            <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center" }}>
              <button
                onClick={savePallet}
                style={{
                  padding: "12px 24px",
                  background: "#2e7d32",
                  color: "white",
                  border: "none",
                  borderRadius: 30,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Salva nel sistema
              </button>
              <button
                onClick={() => {
                  const canvas = document.querySelector("canvas");
                  if (canvas) {
                    const link = document.createElement("a");
                    link.download = `QR-${generatedCode}.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                  }
                }}
                style={{
                  padding: "12px 24px",
                  background: "#ffb300",
                  color: "#111",
                  border: "none",
                  borderRadius: 30,
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Scarica PNG
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </Link>
      </div>
    </div>
  );
}
