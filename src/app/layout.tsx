import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { AppShellHeader } from "@/components/app/AppShellHeader";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Production Tracker",
  description: "Sistema de seguimiento de producción",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <AppShellHeader />

        {children}

        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 3500,
          }}
        />
      </body>
    </html>
  );
}