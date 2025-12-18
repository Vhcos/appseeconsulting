// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "seeconsulting.cl",
  description:
    "Primero levantamos (Wizard). Después generamos el Reporte final (PDF). Y luego hacemos seguimiento semanal/mensual de KPI (Key Performance Indicator, indicador clave de desempeño) con alertas.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
