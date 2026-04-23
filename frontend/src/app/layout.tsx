import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { Wrench } from "lucide-react";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Currículo Check",
  description: "Análise inteligente de currículos",
};

const MAINTENANCE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        {MAINTENANCE ? (
          <main className="min-h-screen flex items-center justify-center bg-white px-4">
            <div className="flex flex-col items-center gap-6 text-center max-w-sm">
              <span className="text-3xl font-bold tracking-tight text-gray-900">Currículo Check</span>
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50">
                <Wrench className="h-8 w-8 text-indigo-500" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold text-gray-900">Estamos em manutenção</h1>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Voltamos em breve com novidades.<br />Obrigado pela paciência!
                </p>
              </div>
            </div>
          </main>
        ) : (
          <>
            {children}
            <FeedbackWidget />
          </>
        )}
      </body>
    </html>
  );
}
