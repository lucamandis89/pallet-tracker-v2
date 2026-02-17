// app/scan/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { addHistory, setLastScan, upsertPallet } from "../lib/storage";

type Camera = { id: string; label: string };

export default function ScanPage() {
  const readerId = "qr-reader";
  const qrRef = useRef<Html5Qrcode | null>(null);

  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraId, setCameraId] = useState<string>("");
  const [status, setStatus] = useState<string>("📷 Inquadra il QR della pedana");
  const [lastResult, setLastResult] = useState<string>("");
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const [manualCode, setManualCode] = useState<string>("");

  const config = useMemo(
    () => ({
      fps: 12,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
      disableFlip: false,
    }),
    []
  );

  async function loadCameras() {
    try {
      const devices = await Html5Qrcode.getCameras();
      const list = (devices || []).map((d) => ({
        id: d.id,
        label: d.label || `Camera ${d.id.slice(0, 6)}`,
      }));
      setCameras(list);

      const back = list.find((c) => /back|rear|posteriore|environment/i.test(c.label));
      setCameraId((prev) => prev || back?.id || list[0]?.id || "");
    } catch (e) {
      console.error(e);
      setStatus("❌ Permesso fotocamera negato o nessuna camera trovata.");
    }
  }

  function getGps(): Promise<{ lat?: number; lng?: number; accuracy?: number }> {
    return new Promise((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    });
  }

  async function persistScan(code: string, source: "qr" | "manual") {
    const clean = (code || "").trim();
    if (!clean) return;

    const gps = await getGps();
    const ts = Date.now();

    // storico
    addHistory({
      code: clean,
      ts,
      lat: gps.lat,
      lng: gps.lng,
      accuracy: gps.accuracy,
      source,
    });

    // ultimo letto (per precompilare in Registro Pedane)
    setLastScan(clean);

    // aggiorna registro pedane "last seen"
    upsertPallet({
      code: clean,
      lastSeenTs: ts,
      lastLat: gps.lat,
      lastLng: gps.lng,
      lastSource: source,
    });
  }

  async function start() {
    if (!cameraId) {
      setStatus("⚠️ Nessuna camera selezionata.");
      return;
    }

    try {
      if (!qrRef.current) qrRef.current = new Html5Qrcode(readerId);

      const state = qrRef.current.getState?.();
      if (state === Html5QrcodeScannerState.SCANNING) return;

      setStatus("🔎 Scansione in corso...");
      await qrRef.current.start(
        { deviceId: { exact: cameraId } },
        config,
        async (decodedText) => {
          const clean = (decodedText || "").trim();
          if (!clean) return;

          setLastResult(clean);
          setStatus("✅ QR letto correttamente!");
          await persistScan(clean, "qr");

          // fermo dopo lettura (come piace a te)
          stop().catch(() => {});
        },
        () => {}
      );

      setIsRunning(true);
    } catch (e) {
      console.error(e);
      // fallback environment
      try {
        setStatus("⚠️ Riprovo con camera posteriore...");
        await qrRef.current?.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            const clean = (decodedText || "").trim();
            if (!clean) return;

            setLastResult(clean);
            setStatus("✅ QR letto correttamente!");
            await persistScan(clean, "qr");
            stop().catch(() => {});
          },
          () => {}
        );
        setIsRunning(true);
      } catch (e2) {
        console.error(e2);
        setStatus("❌ Impossibile avviare la fotocamera (controlla permessi/Chrome).");
        setIsRunning(false);
      }
    }
  }

  async function stop() {
    try {
      if (!qrRef.current) return;
      const state = qrRef.current.getState?.();
      if (state === Html5QrcodeScannerState.NOT_STARTED) return;

      await qrRef.current.stop();
      await qrRef.current.clear();
      setIsRunning(false);
      // non sovrascrivo “QR letto correttamente”, lascio lo stato positivo
    } catch (e) {
      console.error(e);
    }
  }

  function clearResult() {
    setLastResult("");
    setStatus("📷 Inquadra il QR della pedana");
    setManualCode("");
  }

  async function saveManual() {
    const clean = manualCode.trim();
    if (!clean) {
      setStatus("⚠️ Inserisci un codice pedana.");
      return;
    }

    setLastResult(clean);
    setStatus("✅ Salvato manualmente!");
    await persistScan(clean, "manual");
  }

  useEffect(() => {
    loadCameras();
    return () => {
      stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = (bg: string, border: string) => ({
    padding: 14,
    borderRadius: 16,
    background: bg,
    border: `2px solid ${border}`,
    marginTop: 12,
  });

  return (
    <div style={{ padding: 16, maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>📷 Scanner QR Pedane</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Scansiona il QR della pedana. La posizione GPS verrà salvata automaticamente.
      </p>

      <div style={{ padding: 12, borderRadius: 12, background: "#f2f2f2", marginBottom: 12, fontWeight: 700 }}>
        Stato: {status}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", flex: "1 1 280px" }}
          disabled={isRunning}
        >
          {cameras.length === 0 ? (
            <option value="">Nessuna camera</option>
          ) : (
            cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))
          )}
        </select>

        <button
          onClick={() => (isRunning ? stop() : start())}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "none",
            fontWeight: 900,
            cursor: "pointer",
            background: isRunning ? "#e53935" : "#1e88e5",
            color: "white",
          }}
        >
          {isRunning ? "Ferma" : "Avvia"}
        </button>

        <button
          onClick={clearResult}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #ddd",
            fontWeight: 900,
            cursor: "pointer",
            background: "white",
          }}
        >
          Svuota
        </button>
      </div>

      {/* Reader */}
      <div id={readerId} style={{ width: "100%", borderRadius: 18, overflow: "hidden" }} />

      {/* Manual fallback */}
      <div style={card("#fff7e6", "#ffd28a")}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>🛟 QR rovinato? Inserimento manuale</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Es: PEDANA-TEST-001"
            style={{
              flex: "1 1 240px",
              padding: 12,
              borderRadius: 12,
              border: "1px solid #ddd",
              fontWeight: 700,
            }}
          />
          <button
            onClick={saveManual}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "none",
              fontWeight: 900,
              cursor: "pointer",
              background: "#fb8c00",
              color: "white",
            }}
          >
            Salva manuale
          </button>
        </div>
        <div style={{ marginTop: 8, opacity: 0.85, fontSize: 13 }}>
          Consiglio vendita: ogni pedana dovrebbe avere anche un “codice breve” scritto a penna come backup.
        </div>
      </div>

      {lastResult ? (
        <div style={card("#e8f5e9", "#2e7d32")}>
          <div style={{ fontWeight: 900 }}>✅ QR Rilevato:</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 6 }}>{lastResult}</div>
        </div>
      ) : null}

      <div style={{ marginTop: 14 }}>
        <a href="/" style={{ fontWeight: 900, textDecoration: "none" }}>
          ← Torna alla Home
        </a>
      </div>
    </div>
  );
}
