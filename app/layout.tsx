import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CrowdOps AI",
  description: "An iMessage-native operations copilot for World Cup match days."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
