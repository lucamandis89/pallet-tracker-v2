import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pallet Tracker",
    description: "Gestione e tracciamento pedane tra depositi, autisti e negozi",
      manifest: "/manifest.webmanifest",
        themeColor: "#0f172a",
          icons: {
              icon: "/icon-192.png",
                  apple: "/icon-192.png",
                    },
                    };

                    export default function RootLayout({
                      children,
                      }: Readonly<{
                        children: React.ReactNode;
                        }>) {
                          return (
                              <html lang="it">
                                    <body>{children}</body>
                                        </html>
                                          );
                                          }