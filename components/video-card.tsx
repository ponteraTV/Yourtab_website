import Link from "next/link";
import { Play } from "lucide-react";
import type { Video } from "@/lib/content";

export function VideoCard({ video, compact = false }: { video: Video; compact?: boolean }) {
 return <article><Link href={`/videos/${video.slug}`} className={`group relative block overflow-hidden rounded-2xl bg-gradient-to-br ${video.accent} ${compact ? "aspect-video" : "aspect-[16/10]"}`}><div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/0"/><span className="absolute bottom-3 right-3 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white">{video.duration}</span><span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-zinc-900 opacity-0 transition group-hover:opacity-100"><Play size={19} fill="currentColor"/></span></Link><div className="pt-3"><p className="text-xs font-bold uppercase tracking-wider text-[#ff4d37]">{video.category}</p><Link href={`/videos/${video.slug}`} className="mt-1 block text-base font-bold leading-snug tracking-tight hover:underline">{video.title}</Link><p className="mt-1 text-sm text-zinc-500">{video.creator} · {video.views} · {video.age}</p></div></article>;
}
