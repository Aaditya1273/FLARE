import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SILENT — Confidential XRPFi OS",
  description: "The first private institutional treasury and settlement rail for XRP on Flare.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
