import type { Metadata } from "next";
import { APP_CONFIG } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_CONFIG.appName,
  description: APP_CONFIG.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900 min-h-screen" style={{ fontFamily: "'Meiryo UI', 'Meiryo', sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
