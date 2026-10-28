import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Primary (headings, brand, numbers): Syne. Secondary (body, forms, tables): Inter.
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], display: "swap" });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "LFF Accommodation";

export const metadata: Metadata = {
  title: { default: appName, template: `%s · ${appName}` },
  description: "Book church accommodation for your stay and events.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
