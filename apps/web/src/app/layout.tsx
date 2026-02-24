import type { Metadata } from "next";
import { BgmController } from "../components/audio/BgmController";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruptura Arcana MVP",
  description: "Card duel MVP with authoritative server and complete Forbidden Memories fusion table"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BgmController />
        {children}
      </body>
    </html>
  );
}
