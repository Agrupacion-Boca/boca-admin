import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BBB Admin",
  description: "Panel de administración de Boca Boca Boca",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>{children}</body>
    </html>
  );
}
