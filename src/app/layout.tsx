import type { Metadata, Viewport } from "next";
import { Fredoka, Patrick_Hand } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["400", "500", "600", "700"] });
const patrick = Patrick_Hand({ subsets: ["latin"], variable: "--font-patrick", weight: "400" });

export const metadata: Metadata = {
  title: "WriteAid: write faster & neater!",
  description: "A handwriting game for kids. Write in your notebook, and Inky the AI coach gives you tips and XP.",
};

export const viewport: Viewport = { themeColor: "#8b5cf6" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${patrick.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
