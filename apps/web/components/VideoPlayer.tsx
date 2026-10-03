"use client";

import Hls from "hls.js";
import { CSSProperties, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";

type Props = { videoId: string; src: string; poster?: string; title: string };
type Quality = { label: string; value: number };
const icons = {
  play: "▶", pause: "Ⅱ", volume: "◖", mute: "×", fullscreen: "⛶", pip: "▣", captions: "CC", settings: "⚙"
};

function time(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const h = Math.floor(value / 3600); const m = Math.floor((value % 3600) / 60); const s = Math.floor(value % 60);
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default function VideoPlayer({ videoId, src, poster, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null); const wrapRef = useRef<HTMLDivElement>(null); const hlsRef = useRef<Hls | null>(null);
  const resumeKey = `yourtab:progress:${videoId}`;
  const [playing, setPlaying] = useState(false); const [current, setCurrent] = useState(0); const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8); const [muted, setMuted] = useState(false); const [showControls, setShowControls] = useState(true);
  const [qualities, setQualities] = useState<Quality[]>([]); const [quality, setQuality] = useState(-1); const [menu, setMenu] = useState<"quality" | "captions" | null>(null); const [caption, setCaption] = useState(-1);

  const saveProgress = useCallback(() => { const v = videoRef.current; if (v && v.currentTime > 5 && v.currentTime < v.duration - 10) localStorage.setItem(resumeKey, String(v.currentTime)); }, [resumeKey]);
  useEffect(() => {
    const video = videoRef.current; if (!video) return;
    if (Hls.isSupported()) { const hls = new Hls({ enableWorker: true }); hls.loadSource(src); hls.attachMedia(video); hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => setQualities([{ label: "Auto", value: -1 }, ...data.levels.map((l, i) => ({ label: `${l.height}p`, value: i })).filter((x, i, a) => a.findIndex((q) => q.label === x.label) === i)])); hlsRef.current = hls; }
    else if (video.canPlayType("application/vnd.apple.mpegurl")) video.src = src;
    const restore = () => { const saved = Number(localStorage.getItem(resumeKey)); if (saved > 0 && saved < video.duration - 10) video.currentTime = saved; };
    video.addEventListener("loadedmetadata", restore); window.addEventListener("pagehide", saveProgress);
    return () => { video.removeEventListener("loadedmetadata", restore); window.removeEventListener("pagehide", saveProgress); hlsRef.current?.destroy(); };
  }, [src, resumeKey, saveProgress]);
  const togglePlayback = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause(); };
  const seek = (value: number) => { const v = videoRef.current; if (v) { v.currentTime = value; setCurrent(value); } };
  const chooseQuality = (value: number) => { if (hlsRef.current) hlsRef.current.currentLevel = value; setQuality(value); setMenu(null); };
  const chooseCaption = (value: number) => { const tracks = videoRef.current?.textTracks; if (tracks) for (let i = 0; i < tracks.length; i++) tracks[i].mode = i === value ? "showing" : "disabled"; setCaption(value); setMenu(null); };
  const keyboard = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === " ") { event.preventDefault(); togglePlayback(); } if (event.key === "ArrowLeft") seek(Math.max(0, current - 10)); if (event.key === "ArrowRight") seek(Math.min(duration, current + 10)); if (event.key.toLowerCase() === "f") wrapRef.current?.requestFullscreen(); };
  const setVol = (value: number) => { const v = videoRef.current; if (v) { v.volume = value; v.muted = value === 0; } setVolume(value); setMuted(value === 0); };
  const tracks = videoRef.current?.textTracks;
  return <div ref={wrapRef} className="player" tabIndex={0} onKeyDown={keyboard} onMouseMove={() => setShowControls(true)} onMouseLeave={() => setShowControls(false)} aria-label={`${title} video player`}>
    <video ref={videoRef} poster={poster} playsInline onClick={togglePlayback} onPlay={() => setPlaying(true)} onPause={() => { setPlaying(false); saveProgress(); }} onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)} onDurationChange={(e) => setDuration(e.currentTarget.duration)} onEnded={() => localStorage.removeItem(resumeKey)}>
      <track kind="subtitles" srcLang="en" label="English" src="https://media.w3.org/2010/05/sintel/captions.vtt" />
    </video>
    {!playing && <button className="big-play" onClick={togglePlayback} aria-label="Play video">{icons.play}</button>}
    <div className={`controls ${showControls || !playing ? "shown" : ""}`}>
      <input className="timeline" type="range" min="0" max={duration || 0} step="0.1" value={current} onChange={(e) => seek(Number(e.target.value))} style={{ "--progress": `${duration ? (current / duration) * 100 : 0}%` } as CSSProperties} aria-label="Video progress" />
      <div className="control-row"><button onClick={togglePlayback} aria-label={playing ? "Pause" : "Play"}>{playing ? icons.pause : icons.play}</button><span className="time">{time(current)} <i>/</i> {time(duration)}</span><div className="volume"><button onClick={() => { const v = videoRef.current; if (v) { v.muted = !muted; setMuted(!muted); } }} aria-label={muted ? "Unmute" : "Mute"}>{muted ? icons.mute : icons.volume}</button><input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => setVol(Number(e.target.value))} aria-label="Volume" /></div><div className="spacer" />
        <div className="menu-wrap"><button onClick={() => setMenu(menu === "captions" ? null : "captions")} aria-label="Captions" className={caption >= 0 ? "active" : ""}>{icons.captions}</button>{menu === "captions" && <div className="menu"><strong>Captions</strong><button onClick={() => chooseCaption(-1)} className={caption === -1 ? "selected" : ""}>Off</button>{tracks && Array.from({ length: tracks.length }, (_, i) => <button key={i} onClick={() => chooseCaption(i)} className={caption === i ? "selected" : ""}>{tracks[i].label || tracks[i].language}</button>)}</div>}</div>
        <div className="menu-wrap"><button onClick={() => setMenu(menu === "quality" ? null : "quality")} aria-label="Quality settings">{icons.settings}</button>{menu === "quality" && <div className="menu"><strong>Quality</strong>{qualities.map((item) => <button key={item.value} onClick={() => chooseQuality(item.value)} className={quality === item.value ? "selected" : ""}>{item.label}</button>)}</div>}</div>
        <button onClick={() => videoRef.current?.requestPictureInPicture?.()} aria-label="Picture in picture">{icons.pip}</button><button onClick={() => wrapRef.current?.requestFullscreen()} aria-label="Fullscreen">{icons.fullscreen}</button>
      </div>
    </div>
  </div>;
}
