import type { Metadata } from "next";
import { BgmController } from "../components/audio/BgmController";
import { BgmHudControls } from "../components/audio/BgmHudControls";
import { UiPreferencesController } from "../components/ui/UiPreferencesController";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruptura Arcana MVP",
  description: "Card duel MVP with authoritative server and complete Forbidden Memories fusion table"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <UiPreferencesController />
        <BgmController />
        <BgmHudControls />
        {children}
      </body>
    </html>
  );
}
