import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Proof of Vibe — Your onchain soul. Proven. Hidden.",
  description:
    "A 14-day seasonal campaign on Starknet. Mint your Vibe Card. Battle to reveal. Season ends and all is unmasked.",
  openGraph: {
    title: "Proof of Vibe",
    description: "Your onchain soul. Proven. Hidden.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
