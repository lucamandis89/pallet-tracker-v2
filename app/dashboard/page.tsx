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
    lostPallets: 0,
  });
  const [recentScans, setRecentScans] = useState<storage.ScanEvent[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<Record<string, number>>({});

  useEffect(() => {
    const drivers = storage.getDrivers().length;
    const shops = storage.getShops().length;
    const depots = storage.getDepots().length;
    const pallets = storage.getPallets();
    const history = storage.getHistory();

    // Conta pallet per tipo
    const typeCount: Record<string, number> = {};
    pallets.forEach((p) => {
      const type = p.type === "ALTRO" && p.typeCustom ? p.typeCustom : p.type || "Non specificato";
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    // Pallet persi (non visti da 30 giorni)
    const lost = pallets.filter((p) => {
      if (!p.lastSeenTs) return true;
      const daysDiff = (Date.now() - p.lastSeenTs) / (1000 * 60 * 60 * 24);
      return daysDiff > 30;
    }).length;

    setStats({
      drivers,
      shops,
      depots,
      pallets: pallets.length,
      scans: history.length,
      lostPallets: lost,
    });
    setRecentScans(history.slice(0, 5));
    setTypeDistribution(typeCount);
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

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 20 }}>📊 Dashboard</h1>

      {/* Statistiche principali */}
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
        <div style={cardStyle}>
          <div style={{ ...statNumberStyle, color: stats.lostPallets > 0 ? "#d32f2f" : "#1e88e5" }}>
            {stats.lostPallets}
          </div>
          <div style={statLabelStyle}>Pallet persi</div>
        </div>
      </div>

      {/* Distribuzione per tipo */}
      <div style={{ ...cardStyle, textAlign: "left", marginBottom: 30 }}>
        <h3>📊 Distribuzione per tipo</h3>
        {Object.keys(typeDistribution).length === 0 ? (
          <p>Nessun dato</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {Object.entries(typeDistribution).map(([type, count]) => (
              <li key={type} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}>
                <span>{type}</span>
                <span style={{ fontWeight: 700 }}>{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ultime scansioni */}
      <div style={{ ...cardStyle, textAlign: "left" }}>
        <h3>🔄 Ultime scansioni</h3>
        {recentScans.length === 0 ? (
          <p>Nessuna scansione recente.</p>
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
    </div>
  );
}
