import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "SGHR - CENFFOR",
  description: "Sistema de Gestao de Recursos Humanos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-AO" className={inter.className}>
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-on-surface">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
