import type { Metadata } from "next";
import "./globals.css";
import { AdminShell } from "./ui/admin-shell";

export const metadata: Metadata = {
  title: "Yourtab Admin",
  description: "Yourtab administration workspace",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AdminShell>{children}</AdminShell></body>
    </html>
  );
}
