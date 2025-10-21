import type { Metadata } from "next";
import { ClippyProvider } from "@clippyjs/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClippyJS Next.js Starter",
  description: "Next.js starter template with ClippyJS React",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClippyProvider maxAgents={3}>
          {children}
        </ClippyProvider>
      </body>
    </html>
  );
}
