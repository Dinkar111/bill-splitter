import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeScript } from "@/components/ThemeScript";

export const metadata: Metadata = {
  title: "SplitTab",
  description: "Split group bills fairly by what each person actually ordered",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
