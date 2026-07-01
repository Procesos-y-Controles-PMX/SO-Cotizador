import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Saira_Condensed } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const sairaCondensed = Saira_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-saira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SO Cotizador",
  description: "Cotizador Promexma conectado a Supabase",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="es">
      <body className={`${sairaCondensed.variable} min-h-screen font-sans`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
