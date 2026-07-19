import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IDX Financial Analyzer",
  description:
    "Analisis laporan keuangan perusahaan publik BEI secara otomatis dengan AI",
  keywords: ["saham", "BEI", "IDX", "laporan keuangan", "analisis fundamental"],
  openGraph: {
    title: "IDX Financial Analyzer",
    description: "Analisis laporan keuangan perusahaan publik BEI dengan AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
