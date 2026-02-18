"use client";

import React, { useEffect, useState } from "react";
import * as storage from "../lib/storage";
import Link from "next/link";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    drivers: 0,
    shops: 0,
    depots: 0,
    pallets: 0,
    scans: 0,
  });
  const [recentScans, setRecentScans] = useState<storage.ScanEvent[]>([]);

  useEffect(() => {
    const drivers = storage.getDrivers().length;
    const shops = storage.getShops().length;
    const depots = storage.getDepots().length;
    const pallets = storage.getPallets().length;
    const history = storage.getHistory();
    const scans = history.length;

    setStats({ drivers, shops, depots, pallets, scans });
    setRecentScans(history.slice(0, 5));
  }, []);

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
    textAlign: "center",
  };

  const statNumberStyle = { fontSize: 32, fontWeight: 700, color: "#1e88e5" };
  const statLabelStyle = { fontSize: 14, opacity: 0.7, fontWeight: 500 };

  const btnStyle = (bg: string) => ({
    display: "inline-block",
    padding: "12px 24px",
    background: bg,
    color: "white",
    textDecoration: "none",
    borderRadius: 30,
    fontWeight: 600,
    fontSize: 14,
  });

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>📊 Dashboard</h1>

      {/* Pulsante per nuova scansione */}
      <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
        <Link href="/pallets" style={btnStyle("#d32f2f")}>
          📷 Scansiona Pedana
        </Link>
        <p style={{ fontSize: 14, opacity: 0.7, marginTop: 8 }}>
          Vai alla pagina pallet per scansionare codici QR.
        </p>
      </div>

      {/* Statistiche */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 16, marginBottom: 30 }}>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{stats.drivers}</div>
          <div style={statLabelStyle}>Autisti</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{stats.shops}</div>
          <div style={statLabelStyle}>Negozi</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{stats.depots}</div>
          <div style={statLabelStyle}>Depositi</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{stats.pallets}</div>
          <div style={statLabelStyle}>Pallet</div>
        </div>
        <div style={cardStyle}>
          <div style={statNumberStyle}>{stats.scans}</div>
          <div style={statLabelStyle}>Scansioni</div>
        </div>
      </div>

      {/* Ultime scansioni */}
      <div style={{ ...cardStyle, textAlign: "left", padding: 20 }}>
        <h2 style={{ marginTop: 0, fontSize: 20 }}>🔄 Ultime scansioni</h2>
        {recentScans.length === 0 ? (
          <p style={{ opacity: 0.6 }}>Nessuna scansione recente.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {recentScans.map((scan) => (
              <li key={scan.id} style={{ borderBottom: "1px solid #eee", padding: "10px 0" }}>
                <div style={{ fontWeight: 600 }}>📦 {scan.code}</div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>
                  {new Date(scan.ts).toLocaleString()}{" "}
                  {scan.lat && scan.lng && `📍 (${scan.lat.toFixed(4)}, ${scan.lng.toFixed(4)})`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Link rapidi */}
      <div style={{ marginTop: 30, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/drivers" style={btnStyle("#1e88e5")}>Gestione Autisti</Link>
        <Link href="/shops" style={btnStyle("#43a047")}>Gestione Negozi</Link>
        <Link href="/depots" style={btnStyle("#fb8c00")}>Gestione Depositi</Link>
        <Link href="/pallets" style={btnStyle("#8e24aa")}>Gestione Pallet</Link>
      </div>
    </div>
  );
}
