"use client";

import Link from "next/link";

export default function HomePage() {
  // Stili presi dalle altre pagine per coerenza
  const cardStyle: React.CSSProperties = {
    background: "white",
    border: "1px solid #e9e9e9",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
  };

  const btnStyle = (bg: string, color = "white") => ({
    padding: "14px 20px",
    borderRadius: 14,
    border: "none",
    fontWeight: 900 as const,
    cursor: "pointer",
    background: bg,
    color,
    textDecoration: "none",
    display: "inline-block",
    textAlign: "center" as const,
    fontSize: 16,
  });

  return (
    <div style={{ padding: 16, maxWidth: 600, margin: "0 auto" }}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 32, marginBottom: 8, marginTop: 0 }}>
          📦 Pallet Tracker
        </h1>
        <p style={{ fontSize: 18, opacity: 0.8, marginBottom: 24 }}>
          Benvenuto nel sistema di gestione.
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/dashboard" style={btnStyle("#1e88e5")}>
            📊 Dashboard
          </Link>
          <Link href="/drivers" style={btnStyle("#2e7d32")}>
            🚚 Autisti
          </Link>
          <Link href="/shops" style={btnStyle("#6a1b9a")}>
            🏪 Negozi
          </Link>
          <Link href="/depots" style={btnStyle("#b85e00")}>
            🏭 Depositi
          </Link>
          <Link href="/pallets" style={btnStyle("#c2185b")}>
            📦 Pallet
          </Link>
        </nav>
      </div>
    </div>
  );
}
