import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "VaultStream", description: "Secure video storage and streaming." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }

