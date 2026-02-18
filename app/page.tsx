"use client";

import Link from "next/link";

export default function HomePage() {
  const bigButtonStyle = (bg: string) => ({
    display: "block",
    padding: "30px",
    background: bg,
    color: "white",
    textDecoration: "none",
    borderRadius: "30px",
    fontWeight: "bold",
    fontSize: "28px",
    textAlign: "center" as const,
    marginBottom: "16px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
    transition: "transform 0.1s ease",
    cursor: "pointer",
  });

  const secondaryButtonStyle = (bg: string) => ({
    display: "block",
    padding: "20px",
    background: bg,
    color: "white",
    textDecoration: "none",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "22px",
    textAlign: "center" as const,
    marginBottom: "12px",
    boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
  });

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
      <h1 style={{ fontSize: 40, textAlign: "center", marginBottom: 30, color: "#1e3c72" }}>
        📦 PALLET TRACKER
      </h1>

      <Link href="/scan" style={bigButtonStyle("#d32f2f")}>
        📷 SCANSIONA PEDANA
      </Link>

      <Link href="/dashboard" style={secondaryButtonStyle("#1e88e5")}>
        📊 DASHBOARD
      </Link>

      <Link href="/pallets" style={secondaryButtonStyle("#c2185b")}>
        📋 ELENCO PEDANE
      </Link>

      <Link href="/drivers" style={secondaryButtonStyle("#2e7d32")}>
        🚚 AUTISTI
      </Link>

      <Link href="/shops" style={secondaryButtonStyle("#6a1b9a")}>
        🏪 NEGOZI
      </Link>

      <Link href="/depots" style={secondaryButtonStyle("#b85e00")}>
        🏭 DEPOSITI
      </Link>

      <p style={{ textAlign: "center", marginTop: 30, opacity: 0.7, fontSize: 14 }}>
        Premi il pulsante grande per una scansione rapida
      </p>
    </div>
  );
}
