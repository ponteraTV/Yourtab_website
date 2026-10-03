"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navigation = [
  ["⌂", "Overview", "/"], ["◉", "Users", "/users"], ["◈", "Roles", "/roles"],
  ["▶", "Videos", "/videos"], ["▦", "Categories", "/categories"], ["▤", "Comments", "/comments"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <div className="app-shell">
    <aside className={`sidebar ${open ? "is-open" : ""}`}>
      <Link href="/" className="brand"><span className="brand-mark">Y</span><span>Yourtab<span className="brand-accent">.</span></span></Link>
      <p className="workspace-label">WORKSPACE</p>
      <nav>{navigation.map(([icon, label, href]) => <Link onClick={() => setOpen(false)} className={`nav-link ${pathname === href ? "active" : ""}`} href={href} key={href}><span>{icon}</span>{label}</Link>)}</nav>
      <div className="sidebar-bottom"><div className="upgrade"><b>Need a hand?</b><span>Visit the help center</span><button>Get support</button></div><button className="profile"><span className="avatar">NS</span><span><b>Nora Simmons</b><small>Administrator</small></span><i>⌄</i></button></div>
    </aside>
    <main className="main-content"><header className="topbar"><button aria-label="Toggle navigation" onClick={() => setOpen(!open)} className="menu-button">☰</button><div className="crumb">Administration <span>/</span> <b>{navigation.find((item) => item[2] === pathname)?.[1] ?? "Overview"}</b></div><div className="top-actions"><button className="icon-button" aria-label="Search">⌕</button><button className="icon-button notification" aria-label="Notifications">♧</button><button className="avatar avatar-small">NS</button></div></header>{children}</main>
  </div>;
}
