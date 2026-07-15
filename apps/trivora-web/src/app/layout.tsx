import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trivora — Quiz en direct",
  description: "Créez et animez des quiz interactifs en temps réel avec Trivora.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans">{children}</body>
    </html>
  );
}
