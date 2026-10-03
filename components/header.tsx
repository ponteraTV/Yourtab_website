"use client";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);
  return <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-[#fafafa]/90 backdrop-blur">
    <div className="page-shell flex h-16 items-center justify-between px-4 sm:px-6 lg:px-10">
      <Link href="/" className="text-xl font-black tracking-[-0.07em]">your<span className="text-[#ff4d37]">tab</span></Link>
      <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex"><Link href="/">Home</Link><Link href="/playlists">Playlists</Link><Link href="/search">Explore</Link></nav>
      <div className="hidden items-center gap-3 md:flex"><Link href="/search" aria-label="Search" className="rounded-full p-2 text-zinc-600 hover:bg-zinc-200"><Search size={19}/></Link><Link href="/login" className="text-sm font-semibold">Log in</Link><Link href="/register" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700">Join Yourtab</Link></div>
      <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X/> : <Menu/>}</button>
    </div>
    {open && <nav className="border-t border-zinc-200 bg-[#fafafa] px-5 py-4 md:hidden"><div className="grid gap-4 text-sm font-semibold"><Link onClick={() => setOpen(false)} href="/">Home</Link><Link onClick={() => setOpen(false)} href="/playlists">Playlists</Link><Link onClick={() => setOpen(false)} href="/search">Explore</Link><Link onClick={() => setOpen(false)} href="/login">Log in</Link><Link onClick={() => setOpen(false)} href="/register">Join Yourtab</Link></div></nav>}
  </header>;
}
