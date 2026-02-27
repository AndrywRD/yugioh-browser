import type { Metadata, Viewport } from "next";
import { BgmController } from "../components/audio/BgmController";
import { BgmHudControls } from "../components/audio/BgmHudControls";
import { OfflineBanner } from "../components/pwa/OfflineBanner";
import { PwaController } from "../components/pwa/PwaController";
import { GlobalShortcutsHelp } from "../components/ui/GlobalShortcutsHelp";
import { UiPreferencesController } from "../components/ui/UiPreferencesController";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yu-Gi-Oh! Súbita",
  description: "Browser card duel com servidor autoritativo, campanha PvE e duelos PvP em tempo real",
  manifest: "/manifest.json"
};

export const viewport: Viewport = {
  themeColor: "#2a0f3a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PwaController />
        <UiPreferencesController />
        <BgmController />
        <BgmHudControls />
        <OfflineBanner />
        <GlobalShortcutsHelp />
        {children}
      </body>
    </html>
  );
}
