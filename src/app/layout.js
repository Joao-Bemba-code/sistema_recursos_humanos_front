import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import PwaRegister from "@/components/PwaRegister";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "SGHR - Sistema de Gestão de Recursos Humanos",
  description: "Sistema de Gestao de Recursos Humanos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SGHR",
  },
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#002b92",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-AO" className={inter.className}>
      <head>
        <link rel="preload" href="/fonts/material-symbols/material-symbols-outlined.woff2?v=20261128" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link href="/fonts/material-symbols.css?v=20261128" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-on-surface">
        <AuthProvider>{children}</AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
