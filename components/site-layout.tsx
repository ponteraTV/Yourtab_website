import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
export function SiteLayout({ children }: { children: React.ReactNode }) { return <><Header/><main className="page-shell min-h-[calc(100vh-220px)]">{children}</main><Footer/></>; }
