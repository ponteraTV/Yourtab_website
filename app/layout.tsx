import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Yourtab — Find your next watch", description: "A thoughtful home for videos worth watching." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
