"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hls from "hls.js";

function VideoPlayer({ src, onView }: { src?: string | null; onView?: (positionSec:number)=>void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState("");

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    setPlaybackError("");
    video.removeAttribute("src");
    video.load();

    if (!src) {
      setPlaybackError("Video stream URL is missing.");
      return;
    }

    const isHls = src.toLowerCase().includes(".m3u8");
    if (!isHls) {
      const onError = () => setPlaybackError("Video could not be decoded. Check that the uploaded file is a supported video.");
      video.addEventListener("error", onError);
      video.src = src;
      return () => video.removeEventListener("error", onError);
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
      });
      let networkRetries = 0;
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
          networkRetries += 1;
          hls.startLoad();
          return;
        }
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }
        setPlaybackError(`Playback failed (${data.details}). Please reload and try again.`);
        hls.destroy();
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => setPlaybackError(""));
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      const onError = () => setPlaybackError("This device could not play the HLS stream. Try refreshing the page or using an updated browser.");
      video.addEventListener("error", onError);
      video.src = src;
      return () => video.removeEventListener("error", onError);
    }

    setPlaybackError("This browser does not support HLS playback. Please use an updated Safari or Chrome browser.");
  }, [src]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src || !onView) return;
    let counted = false;
    const handlePlay = () => { if (!counted) { counted = true; onView(Math.floor(video.currentTime || 0)); } };
    video.addEventListener("play", handlePlay);
    return () => video.removeEventListener("play", handlePlay);
  }, [src, onView]);

  return <div className="relative h-full w-full">
    <video ref={ref} controls playsInline preload="metadata" crossOrigin="anonymous" className="h-full w-full object-contain" />
    {playbackError && <div role="status" className="absolute inset-x-2 bottom-12 rounded-lg bg-black/85 p-3 text-sm text-white">{playbackError}</div>}
  </div>;
}
type Video = { id:string; title:string; description?:string; views:string|number; hasHls?:boolean; streamUrl?:string|null; thumbnailKey?:string|null; };

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

async function api(path:string, options:RequestInit={}) {
  const res = await fetch(`${API}${path}`, { ...options, credentials:"include", headers:{"Content-Type":"application/json", ...(options.headers||{})} });
  const json = await res.json().catch(()=>({}));
  if (!res.ok) throw new Error(json.message || "Request failed");
  return json.data;
}

export default function HomePage() {
  const [videos,setVideos]=useState<Video[]>([]);
  const [search,setSearch]=useState("");
  const [user,setUser]=useState<any>(null);
  const [error,setError]=useState("");

  const load=async()=>{try{const d=await api(`/v1/videos?search=${encodeURIComponent(search)}`);setVideos(d.items||[]);setError("")}catch(e:any){setError(e.message)}};
  useEffect(()=>{load();api("/v1/auth/me").then(setUser).catch(()=>{})},[]);

  async function logout(){
    try { await api("/v1/auth/logout",{method:"POST"}); setUser(null); }
    catch { setError("Unable to sign out. Please try again."); }
  }

  return <main className="min-h-screen">
    <nav className="sticky top-0 z-20 border-b border-white/10 bg-black/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-2xl font-black tracking-tight">Your<span className="text-cyan-400">Tab</span></Link>
        <div className="flex items-center gap-3">
          {user ? <><span className="hidden text-sm text-gray-300 sm:block">Hi, {user.name}</span><button className="glass-button" onClick={logout}>Logout</button></> :
          <><Link href="/login" className="glass-button">Login</Link><Link href="/register" className="glass-button border-cyan-300/30 bg-cyan-400/15">Sign up</Link></>}
        </div>
      </div>
    </nav>
    <section className="mx-auto max-w-7xl px-6 pb-12 pt-20">
      <div className="glass-panel rounded-[2rem] p-8 md:p-14">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[.3em] text-cyan-300">Premium video platform</p>
        <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">Watch. Upload. <span className="text-cyan-300">Share.</span></h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-300">A complete streaming foundation with accounts, playlists, search, likes, history, HLS processing and an admin control layer.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row"><input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="Search videos..." className="flex-1 rounded-full border border-white/15 bg-white/5 px-5 py-3 outline-none"/><button className="glass-button bg-cyan-400/20" onClick={load}>Search</button></div>
      </div>
    </section>
    <section className="mx-auto max-w-7xl px-6 pb-16">
      <div className="mb-6 flex items-center justify-between"><h2 className="text-3xl font-bold">Latest videos</h2><span className="text-sm text-gray-500">{videos.length} results</span></div>
      {error&&<p role="status" className="mb-4 text-sm text-red-300">{error}</p>}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{videos.map(v=><article key={v.id} className="glass-panel overflow-hidden rounded-3xl transition hover:-translate-y-1">
        <div className="aspect-video bg-gradient-to-br from-cyan-500/20 to-purple-600/20"><VideoPlayer src={v.hasHls ? `${API}/v1/videos/${v.id}/stream/index.m3u8` : (v.streamUrl ?? null)} onView={(positionSec)=>api(`/v1/videos/${v.id}/view`,{method:"POST",body:JSON.stringify({positionSec})}).catch(()=>{})}/></div>
        <div className="p-5"><h3 className="line-clamp-2 text-lg font-bold">{v.title}</h3><p className="mt-2 text-sm text-gray-400">{Number(v.views).toLocaleString()} views</p></div>
      </article>)}</div>
      {!videos.length&&<div className="glass-panel rounded-3xl p-12 text-center text-gray-400">No published videos yet. Upload one from the admin area after the API and worker are running.</div>}
    </section>
  </main>
}
