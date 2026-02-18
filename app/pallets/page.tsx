"use client";

import React, { useState } from "react";
import * as storage from "../lib/storage";
import { QRCodeCanvas } from "qrcode.react";
import Link from "next/link";

export default function QrGeneratorPage() {
  const [kind, setKind] = useState<storage.StockLocationKind>("DEPOSITO");
  const [locationId, setLocationId] = useState("");
  const [palletType, setPalletType] = useState("EURO");
  const [qty, setQty] = useState<number>(1);

  const qrValue = JSON.stringify({
    kind,
    id: locationId.trim(),
    palletType: palletType.trim(),
    qty: Number(qty) || 1,
  });

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>
        Generatore QR (per tipologia)
      </h1>

      <div style={{ marginBottom: 16 }}>
        <Link href="/" style={{ textDecoration: "underline" }}>
          ← Torna al menu
        </Link>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <label style={{ display: "block", marginBottom: 10 }}>
          <b>Tipo posizione</b>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as storage.StockLocationKind)}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ccc",
              marginTop: 6,
            }}
          >
            <option value="DEPOSITO">Deposito</option>
            <option value="NEGOZIO">Negozio</option>
            <option value="AUTISTA">Autista</option>
          </select>
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <b>ID Posizione</b>
          <input
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="es: DEP-01 oppure AUT-ROSSI"
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ccc",
              marginTop: 6,
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <b>Tipo Pedana</b>
          <input
            value={palletType}
            onChange={(e) => setPalletType(e.target.value)}
            placeholder="es: EURO"
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ccc",
              marginTop: 6,
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 10 }}>
          <b>Quantità</b>
          <input
            type="number"
            value={qty}
            min={1}
            onChange={(e) => setQty(Number(e.target.value))}
            style={{
              display: "block",
              width: "100%",
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ccc",
              marginTop: 6,
            }}
          />
        </label>
      </div>

      <div
        style={{
          textAlign: "center",
          background: "#fff",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>
          QR Generato
        </h2>

        {locationId.trim() ? (
          <>
            <QRCodeCanvas value={qrValue} size={240} />

            <p style={{ marginTop: 12, fontSize: 12, color: "#555" }}>
              Contenuto QR:
              <br />
              <code>{qrValue}</code>
            </p>
          </>
        ) : (
          <p style={{ color: "#888" }}>
            Inserisci un ID posizione per generare il QR.
          </p>
        )}
      </div>
    </div>
  );
}
