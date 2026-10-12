"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ChangeEvent } from "react";
import AdminFeaturePanel from "./features-panel";

// Use the Cloudflare same-origin proxy so session cookies remain first-party.
const API = "/api";

async function api(path: string, options: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.message || j.error || "Request failed");
  return j.data;
}

function putWithProgress(url: string, body: Blob, contentType: string, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.min(100, Math.floor((event.loaded / event.total) * 100))); };
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Storage upload failed (HTTP " + xhr.status + "). Check Spaces CORS and the signed Content-Type."));
    xhr.onerror = () => reject(new Error("Could not reach DigitalOcean Spaces. Bucket CORS must allow this website origin, PUT, and Content-Type."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.send(body);
  });
}

async function captionAsVtt(file: File): Promise<Blob> {
  const text = await file.text();
  if (/^\s*WEBVTT(?:\s|$)/.test(text)) return new Blob([text], { type: "text/vtt" });
  if (!/\.srt$/i.test(file.name)) throw new Error("Captions must be a WebVTT (.vtt) or SubRip (.srt) file.");
  const body = text.replace(/^\uFEFF/, "").replace(/\r/g, "").replace(/(\d{2}:\d{2}:\d{2}),(\d{3})(\s*-->\s*\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2 --> $3.$4");
  if (!/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/.test(body)) throw new Error("The SRT caption file has no valid timestamp cues.");
  return new Blob(["WEBVTT\n\n" + body.trim() + "\n"], { type: "text/vtt" });
}

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearch, setAuditSearch] = useState("");
  const [adName, setAdName] = useState("");
  const [adType, setAdType] = useState("BANNER");
  const [adProvider, setAdProvider] = useState("DIRECT");
  const [adEmbedCode, setAdEmbedCode] = useState("");
  const [adMediaUrl, setAdMediaUrl] = useState("");
  const [adTargetUrl, setAdTargetUrl] = useState("");
  const [adStartAt, setAdStartAt] = useState("");
  const [adEndAt, setAdEndAt] = useState("");
  const [editingAdId, setEditingAdId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [tagName, setTagName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");
  const [editingTagId, setEditingTagId] = useState("");
  const [editingTagName, setEditingTagName] = useState("");
  const [msg, setMsg] = useState("");
  const [upload, setUpload] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [captionFile, setCaptionFile] = useState<File | null>(null);
  const [captionLanguage, setCaptionLanguage] = useState("en");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [activeSection, setActiveSection] = useState("dashboard");

  const load = async () => {
    setLoading(true);
    setDenied(false);
    try {
      const m = await api("/v1/auth/me");
      if (!m || !["ADMIN", "MODERATOR"].includes(m.role)) {
        setMe(null);
        setDenied(true);
        setMsg(m ? "Admin access required" : "Sign in required");
        return;
      }
      setMe(m);
      setStats(await api("/v1/admin/stats"));
      setUsers(await api("/v1/admin/users"));
      setVideos(await api("/v1/admin/videos"));
      setCategories(await api("/v1/admin/categories"));
      setTags(await api("/v1/admin/tags"));
      setAds(await api("/v1/admin/ads"));
      setAuditLogs(await api("/v1/admin/audit"));
      setMsg("");
    } catch (e: any) {
      setMe(null);
      setDenied(true);
      setMsg(e.message || "Sign in required");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!me || !["videos", "upload"].includes(activeSection)) return;
    const timer = window.setInterval(async () => { try { setVideos(await api("/v1/admin/videos")); } catch { /* retain last known state */ } }, 4000);
    return () => window.clearInterval(timer);
  }, [activeSection, me]);

  function selectVideo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const extension = f.name.split(".").pop()?.toLowerCase() || "";
    const types: Record<string, string> = { mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo", mpg: "video/mpeg", mpeg: "video/mpeg", "3gp": "video/3gpp" };
    if (!(f.type.startsWith("video/") || types[extension])) { setMsg("Unsupported video type. Choose MP4, MOV, WebM, MKV, AVI, MPEG, or 3GP."); setSelectedVideo(null); return; }
    setSelectedVideo(f);
    setVideoTitle(f.name.replace(/\.[^.]+$/, ""));
    setMsg("");
  }

  async function startUpload() {
    const f = selectedVideo;
    if (!f || !me || upload) return;
    const extension = f.name.split(".").pop()?.toLowerCase() || "";
    const types: Record<string, string> = { mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo", mpg: "video/mpeg", mpeg: "video/mpeg", "3gp": "video/3gpp" };
    const contentType = f.type.startsWith("video/") ? f.type : types[extension];
    if (!contentType) { setMsg("Unsupported video type."); return; }
    if (!videoTitle.trim()) { setMsg("Please enter a video title."); return; }
    setUpload(true); setUploadProgress(0); setUploadStage("Preparing video upload"); setMsg("");
    try {
      const p = await api("/v1/uploads/presign", { method: "POST", body: JSON.stringify({ filename: f.name, contentType }) });
      setUploadStage("Uploading video");
      await putWithProgress(p.url, f, contentType, setUploadProgress);
      const captions: Array<{ key: string; language: string; label: string }> = [];
      if (captionFile) {
        setUploadProgress(0); setUploadStage("Preparing captions");
        const vtt = await captionAsVtt(captionFile);
        const cp = await api("/v1/uploads/caption-presign", { method: "POST", body: JSON.stringify({ filename: captionFile.name, contentType: "text/vtt" }) });
        setUploadStage("Uploading captions");
        await putWithProgress(cp.url, vtt, "text/vtt", setUploadProgress);
        const language = captionLanguage.trim() || "en";
        captions.push({ key: cp.key, language, label: language.toUpperCase() });
      }
      setUploadProgress(100); setUploadStage("Saving video and queueing processing");
      await api("/v1/videos", { method: "POST", body: JSON.stringify({ title: videoTitle.trim(), description: videoDescription.trim(), sourceKey: p.key, captions }) });
      setMsg("Upload complete. Processing started; Video Management shows the actual processing percentage.");
      setSelectedVideo(null); setVideoTitle(""); setVideoDescription(""); setCaptionFile(null); setCaptionLanguage("en"); setUploadProgress(0);
      await load();
    } catch (e: any) {
      setMsg(e.message || "Video upload failed. Check the API and Spaces upload response.");
    } finally { setUpload(false); setUploadStage(""); }
  }
  async function user(id: string, status: string, role: string) {
    try {
      await api("/v1/admin/users/" + id, {
        method: "PATCH",
        body: JSON.stringify({ status, role }),
      });
      await load();
    } catch (e: any) {
      setMsg(e.message || "User update failed");
    }
  }

  async function video(id: string, status: string) {
    try {
      await api("/v1/admin/videos/" + id, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e: any) {
      setMsg(e.message || "Video update failed");
    }
  }


  async function createCategory() {
    try {
      await api("/v1/admin/categories", { method: "POST", body: JSON.stringify({ name: categoryName, description: categoryDescription }) });
      setCategoryName(""); setCategoryDescription(""); setMsg("Category created."); await load();
    } catch (e: any) { setMsg(e.message || "Could not create category."); }
  }
  async function saveCategory(id: string) {
    try {
      await api("/v1/admin/categories/" + id, { method: "PATCH", body: JSON.stringify({ name: editingCategoryName, description: editingCategoryDescription }) });
      setEditingCategoryId(""); setMsg("Category updated."); await load();
    } catch (e: any) { setMsg(e.message || "Could not update category."); }
  }
  async function deleteCategory(id: string, name: string) {
    if (!window.confirm('Delete category "' + name + '"? Videos will remain, but this category link will be removed.')) return;
    try { await api("/v1/admin/categories/" + id, { method: "DELETE" }); setMsg("Category deleted."); await load(); }
    catch (e: any) { setMsg(e.message || "Could not delete category."); }
  }
  async function createTag() {
    try {
      await api("/v1/admin/tags", { method: "POST", body: JSON.stringify({ name: tagName }) });
      setTagName(""); setMsg("Tag created."); await load();
    } catch (e: any) { setMsg(e.message || "Could not create tag."); }
  }
  async function saveTag(id: string) {
    try {
      await api("/v1/admin/tags/" + id, { method: "PATCH", body: JSON.stringify({ name: editingTagName }) });
      setEditingTagId(""); setMsg("Tag updated."); await load();
    } catch (e: any) { setMsg(e.message || "Could not update tag."); }
  }
  function resetAdForm() {
    setAdName(""); setAdType("BANNER"); setAdProvider("DIRECT"); setAdMediaUrl(""); setAdEmbedCode(""); setAdTargetUrl(""); setAdStartAt(""); setAdEndAt(""); setEditingAdId("");
  }
  function editAd(ad: any) {
    setEditingAdId(ad.id); setAdName(ad.name); setAdType(ad.type); setAdProvider(ad.provider || "DIRECT"); setAdMediaUrl(ad.mediaUrl || ""); setAdEmbedCode(ad.embedCode || ""); setAdTargetUrl(ad.targetUrl || "");
    setAdStartAt(ad.startAt ? new Date(ad.startAt).toISOString().slice(0,16) : "");
    setAdEndAt(ad.endAt ? new Date(ad.endAt).toISOString().slice(0,16) : "");
  }
  async function saveAd() {
    const payload = { name: adName.trim(), type: adType, provider: adProvider, mediaUrl: adMediaUrl.trim() || null, embedCode: adEmbedCode.trim() || null, targetUrl: adTargetUrl.trim() || null, startAt: adStartAt ? new Date(adStartAt).toISOString() : null, endAt: adEndAt ? new Date(adEndAt).toISOString() : null };
    try {
      await api(editingAdId ? "/v1/admin/ads/" + editingAdId : "/v1/admin/ads", { method: editingAdId ? "PATCH" : "POST", body: JSON.stringify(payload) });
      setMsg(editingAdId ? "Advertisement updated." : "Advertisement created in paused state."); resetAdForm(); await load();
    } catch (e: any) { setMsg(e.message || "Could not save advertisement."); }
  }
  async function changeAdStatus(ad: any, status: string) {
    try { await api("/v1/admin/ads/" + ad.id, { method: "PATCH", body: JSON.stringify({ status }) }); setMsg("Advertisement status updated."); await load(); }
    catch (e: any) { setMsg(e.message || "Could not update advertisement status."); }
  }
  async function deleteAd(ad: any) {
    if (!window.confirm('Delete advertisement "' + ad.name + '"? This cannot be undone.')) return;
    try { await api("/v1/admin/ads/" + ad.id, { method: "DELETE" }); if (editingAdId === ad.id) resetAdForm(); setMsg("Advertisement deleted."); await load(); }
    catch (e: any) { setMsg(e.message || "Could not delete advertisement."); }
  }

  async function deleteTag(id: string, name: string) {
    if (!window.confirm('Delete tag "' + name + '"? Videos will remain, but this tag link will be removed.')) return;
    try { await api("/v1/admin/tags/" + id, { method: "DELETE" }); setMsg("Tag deleted."); await load(); }
    catch (e: any) { setMsg(e.message || "Could not delete tag."); }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-xl p-10">
        <div className="glass-panel rounded-3xl p-8">
          <h1 className="text-3xl font-bold">YourTab Admin</h1>
          <p className="mt-3 text-gray-400">Checking administrator session…</p>
        </div>
      </main>
    );
  }

  if (denied || !me) {
    return (
      <main className="mx-auto max-w-xl p-10">
        <div className="glass-panel rounded-3xl p-8">
          <h1 className="text-3xl font-bold">Admin login required</h1>
          <p className="mt-3 text-red-300">
            {msg || "Please sign in with an ADMIN or MODERATOR account first."}
          </p>
          <a href="/#account" className="mt-6 inline-block glass-button">
            Sign in
          </a>
          <a href="/" className="ml-3 mt-6 inline-block glass-button">
            Back to YourTab
          </a>
        </div>
      </main>
    );
  }

  // Keep the existing working sections intact. The additional entries restore
  // the planned navigation only; unfinished features remain clearly marked.
  const menuGroups = [
    {
      label: "OVERVIEW",
      items: [{ id: "dashboard", label: "Dashboard", icon: "▦" }],
    },
    {
      label: "CONTENT",
      items: [
        { id: "upload", label: "Video Upload", icon: "↑" },
        { id: "videos", label: "Video Management", icon: "▶" },
        { id: "categories", label: "Categories", icon: "▤" },
        { id: "tags", label: "Tags", icon: "#" },
        { id: "playlists", label: "Playlists", icon: "☷" },
        { id: "pages", label: "Pages & Posts", icon: "▧" },
        { id: "comments", label: "Comments", icon: "☏" },
      ],
    },
    {
      label: "USERS & ACCESS",
      items: [
        { id: "users", label: "User Management", icon: "♙" },
        { id: "roles", label: "Roles & Permissions", icon: "⚿" },
      ],
    },
    {
      label: "MONETIZATION",
      items: [
        { id: "ads", label: "Advertisements", icon: "▣" },
        { id: "subscriptions", label: "Subscriptions", icon: "▱" },
        { id: "revenue", label: "Revenue Reports", icon: "$" },
      ],
    },
    {
      label: "INSIGHTS",
      items: [{ id: "analytics", label: "Analytics", icon: "↗" }],
    },
    {
      label: "WEBSITE",
      items: [
        { id: "website", label: "Website Editor", icon: "✎" },
        { id: "navigation", label: "Site Navigation", icon: "☰" },
        { id: "theme", label: "Theme & Branding", icon: "◐" },
      ],
    },
    {
      label: "STORAGE & PROCESSING",
      items: [
        { id: "storage", label: "Storage & CDN", icon: "▣" },
        { id: "processing", label: "Processing Queue", icon: "⟳" },
      ],
    },
    {
      label: "SYSTEM",
      items: [
        { id: "notifications", label: "Notifications", icon: "♢" },
        { id: "audit", label: "Audit Logs", icon: "≡" },
        { id: "settings", label: "System Settings", icon: "⚙" },
        { id: "profile", label: "Admin Profile", icon: "♙" },
      ],
    },
  ];
  const sections = menuGroups.flatMap((group) => group.items);
  const availableSections = ["dashboard", "videos", "users", "categories", "tags", "ads", "audit", "profile", "playlists", "pages", "comments", "roles", "subscriptions", "revenue", "analytics", "website", "navigation", "theme", "storage", "processing", "notifications", "settings", ...(me.role === "ADMIN" ? ["upload"] : [])];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-2 py-4 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-cyan-300 text-xs uppercase tracking-[.25em]">Control center</p>
          <h1 className="text-3xl font-black sm:text-4xl">YourTab Admin</h1>
          <Link href="/profile" className="mt-2 inline-block text-sm text-gray-400 hover:text-cyan-300" aria-label="Open admin profile">{me.name || me.email} · {me.role} · Profile</Link>
        </div>
        <a href="/" className="glass-button">View website</a>
      </div>

      {msg && <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm" role="status">{msg}</div>}

      <div className="grid grid-cols-[132px_minmax(0,1fr)] items-start gap-2 sm:grid-cols-[190px_minmax(0,1fr)] sm:gap-4 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-5">
        <aside className="glass-panel sticky top-2 max-h-[calc(100vh-1rem)] min-w-0 overflow-y-auto rounded-xl p-1.5 sm:rounded-2xl sm:p-3">
          <p className="px-1 pb-2 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:px-3 sm:text-xs sm:tracking-wider">Admin menu</p>
          <nav aria-label="Admin sections" className="flex flex-col gap-2 sm:gap-3">
            {menuGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p className="break-words px-1 pb-1 text-[8px] font-bold tracking-normal text-gray-500 sm:px-3 sm:text-[10px] sm:tracking-[.16em]">{group.label}</p>
                <div className="flex min-w-0 flex-col gap-1">
                  {group.items.map((section) => {
                    const active = activeSection === section.id;
                    const available = availableSections.includes(section.id);
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => section.id === "profile" ? window.location.assign("/profile") : setActiveSection(section.id)}
                        aria-current={active ? "page" : undefined}
                        className={"flex w-full min-w-0 items-start gap-1.5 rounded-lg px-1.5 py-2 text-left text-[11px] leading-tight transition sm:items-center sm:gap-2 sm:rounded-xl sm:px-3 sm:py-3 sm:text-sm " +
                          (active ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30 " : "text-gray-300 hover:bg-white/5 ") +
                          (!available ? "opacity-80 " : "")}
                      >
                        <span aria-hidden="true" className="w-4 shrink-0 text-center text-sm sm:w-5 sm:text-base">{section.icon}</span>
                        <span className="min-w-0 break-words">{section.label}</span>
                        {!available && <span className="ml-auto hidden rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-gray-400 xl:inline">Planned</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          {activeSection === "dashboard" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Dashboard overview</h2>
              <p className="mt-1 text-sm text-gray-400">Platform summary and quick navigation.</p>
              {stats ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Object.entries(stats).map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="break-words text-xs uppercase tracking-wide text-gray-500">{k}</p>
                      <p className="mt-2 text-2xl font-bold">{String(v)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-5 text-sm text-gray-400">Dashboard statistics are not available right now.</p>}
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setActiveSection("upload")} className="glass-button text-left">↑ Upload a video</button>
                <button type="button" onClick={() => setActiveSection("videos")} className="glass-button text-left">▶ Manage videos</button>
                <button type="button" onClick={() => setActiveSection("users")} className="glass-button text-left">♙ Manage users</button>
              </div>
            </section>
          )}

          {["playlists", "pages", "comments", "roles", "subscriptions", "revenue", "analytics", "website", "navigation", "theme", "storage", "processing", "notifications", "settings"].includes(activeSection) && (
            <AdminFeaturePanel section={activeSection} onMessage={setMsg} />
          )}

          {activeSection === "upload" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Video upload</h2>
              {me.role === "ADMIN" ? <>
                <p className="mt-2 text-sm text-gray-400">Upload directly to storage; the worker creates HLS. Keep this page open until upload finishes.</p>
                <label className={"mt-6 inline-flex glass-button cursor-pointer " + (upload ? "pointer-events-none opacity-50" : "")}>
                  <input disabled={upload} type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.mpeg,.mpg,.3gp" className="hidden" onChange={selectVideo} />
                  {selectedVideo ? "Choose a different video" : "Choose video"}
                </label>
                {selectedVideo && <div className="mt-5 grid gap-4">
                  <p className="break-all text-sm text-gray-300">{selectedVideo.name} · {(selectedVideo.size / (1024 * 1024)).toFixed(1)} MB</p>
                  <label className="grid gap-2 text-sm text-gray-300">Video title<input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} maxLength={160} className="glass-input rounded-xl p-3 text-white" placeholder="Enter video title" /></label>
                  <label className="grid gap-2 text-sm text-gray-300">Description<textarea value={videoDescription} onChange={e => setVideoDescription(e.target.value)} maxLength={5000} rows={3} className="glass-input rounded-xl p-3 text-white" placeholder="Add a video description (optional)" /></label>
                  <label className="grid gap-2 text-sm text-gray-300">Captions / subtitles (.vtt or .srt)<input disabled={upload} type="file" accept=".vtt,.srt,text/vtt,application/x-subrip" onChange={e => setCaptionFile(e.target.files?.[0] || null)} className="block w-full text-sm" /></label>
                  {captionFile && <label className="grid gap-2 text-sm text-gray-300">Caption language (e.g. en, bn, en-US)<input value={captionLanguage} onChange={e => setCaptionLanguage(e.target.value)} maxLength={12} className="glass-input rounded-xl p-3 text-white" /></label>}
                  {upload && <div className="grid gap-2" role="status" aria-live="polite"><div className="flex justify-between gap-3 text-sm"><span>{uploadStage}</span><span>{uploadProgress}%</span></div><progress className="w-full" max={100} value={uploadProgress} /></div>}
                  <button type="button" disabled={upload} onClick={startUpload} className="glass-button w-fit disabled:opacity-50">{upload ? "Working…" : "Upload video"}</button>
                </div>}
              </> : <p className="mt-2 text-sm text-amber-200">Only an ADMIN account can upload videos. Your role is {me.role}.</p>}
            </section>
          )}

          {activeSection === "videos" && (
            <section className="glass-panel overflow-x-auto rounded-3xl p-5 sm:p-6">
              <h2 className="mb-1 text-2xl font-bold">Video management</h2>
              <p className="mb-4 text-sm text-gray-400">Review video status and block a video when needed.</p>
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Views</th><th className="p-3">Action</th></tr></thead>
                <tbody>
                  {videos.map(v => (
                    <tr key={v.id} className="border-b border-white/5">
                      <td className="p-3">{v.title}</td>
                      <td className="p-3">{v.status}{(v.processingJobs || []).some((j: any) => j.status === "PROCESSING" || j.status === "QUEUED") && <div className="mt-1 text-xs text-cyan-300">{v.processingJobs.find((j: any) => j.status === "PROCESSING") ? ("Processing " + (v.processingJobs.find((j: any) => j.status === "PROCESSING")?.progress ?? 0) + "%") : "Queued for processing"}</div>}</td>
                      <td className="p-3">{Number(v.views)}</td>
                      <td className="p-3">
                        {v.status === "PROCESSING" && <span className="text-xs text-gray-500">Processing…</span>}
                        {(v.status === "READY" || v.status === "DRAFT") && <button className="glass-button" onClick={() => video(v.id, "BLOCKED")}>Block</button>}
                        {v.status === "BLOCKED" && <span className="text-xs text-gray-500">Blocked</span>}
                      </td>
                    </tr>
                  ))}
                  {videos.length === 0 && <tr><td className="p-3 text-gray-400" colSpan={4}>No videos found.</td></tr>}
                </tbody>
              </table>
            </section>
          )}

          {activeSection === "users" && (
            <section className="glass-panel overflow-x-auto rounded-3xl p-5 sm:p-6">
              <h2 className="mb-1 text-2xl font-bold">User management</h2>
              <p className="mb-4 text-sm text-gray-400">Activate/suspend accounts and manage roles. Grant administrator access only to trusted accounts.</p>
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="p-3">{u.name}</td>
                      <td className="p-3">{u.email}</td>
                      <td className="p-3">{u.role}</td>
                      <td className="p-3">{u.status}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="glass-button" onClick={() => user(u.id, u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED", u.role)}>{u.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>
                          <button className="glass-button" onClick={() => user(u.id, u.status, u.role === "ADMIN" ? "USER" : "ADMIN")}>{u.role === "ADMIN" ? "Make user" : "Make admin"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && <tr><td className="p-3 text-gray-400" colSpan={5}>No users found.</td></tr>}
                </tbody>
              </table>
            </section>
          )}


          {activeSection === "categories" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Categories</h2>
              <p className="mt-2 text-sm text-gray-400">Create, rename, and remove video categories. Removing a category does not delete its videos.</p>
              <form className="mt-5 grid gap-3" onSubmit={e => { e.preventDefault(); void createCategory(); }}>
                <label className="grid gap-2 text-sm text-gray-300">Category name<input required minLength={2} maxLength={80} value={categoryName} onChange={e => setCategoryName(e.target.value)} className="glass-input rounded-xl p-3 text-white" placeholder="e.g. Education" /></label>
                <label className="grid gap-2 text-sm text-gray-300">Description (optional)<textarea maxLength={500} value={categoryDescription} onChange={e => setCategoryDescription(e.target.value)} className="glass-input rounded-xl p-3 text-white" rows={2} placeholder="Short category description" /></label>
                <button className="glass-button w-fit" type="submit">Add category</button>
              </form>
              <div className="mt-6 grid gap-3">
                {categories.map(c => <div key={c.id} className="rounded-2xl border border-white/10 p-4">
                  {editingCategoryId === c.id ? <div className="grid gap-3">
                    <input aria-label="Edit category name" value={editingCategoryName} onChange={e => setEditingCategoryName(e.target.value)} maxLength={80} className="glass-input rounded-xl p-3 text-white" />
                    <textarea aria-label="Edit category description" value={editingCategoryDescription} onChange={e => setEditingCategoryDescription(e.target.value)} maxLength={500} rows={2} className="glass-input rounded-xl p-3 text-white" />
                    <div className="flex flex-wrap gap-2"><button type="button" className="glass-button" onClick={() => void saveCategory(c.id)}>Save</button><button type="button" className="glass-button" onClick={() => setEditingCategoryId("")}>Cancel</button></div>
                  </div> : <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-semibold">{c.name}</p><p className="mt-1 text-sm text-gray-400">{c.description || "No description"} · {c.slug}</p></div>
                    <div className="flex gap-2"><button type="button" className="glass-button" onClick={() => { setEditingCategoryId(c.id); setEditingCategoryName(c.name); setEditingCategoryDescription(c.description || ""); }}>Edit</button><button type="button" className="glass-button" onClick={() => void deleteCategory(c.id, c.name)}>Delete</button></div>
                  </div>}
                </div>)}
                {categories.length === 0 && <p className="text-sm text-gray-400">No categories yet.</p>}
              </div>
            </section>
          )}

          {activeSection === "tags" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Tags</h2>
              <p className="mt-2 text-sm text-gray-400">Create, rename, and remove tags used to organize videos.</p>
              <form className="mt-5 flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); void createTag(); }}>
                <input required minLength={2} maxLength={50} value={tagName} onChange={e => setTagName(e.target.value)} className="glass-input min-w-0 flex-1 rounded-xl p-3 text-white" placeholder="e.g. tutorial" aria-label="New tag name" />
                <button className="glass-button" type="submit">Add tag</button>
              </form>
              <div className="mt-6 flex flex-wrap gap-3">
                {tags.map(t => <div key={t.id} className="max-w-full rounded-2xl border border-white/10 p-3">
                  {editingTagId === t.id ? <div className="grid gap-3"><input aria-label="Edit tag name" value={editingTagName} onChange={e => setEditingTagName(e.target.value)} maxLength={50} className="glass-input min-w-0 rounded-xl p-3 text-white" /><div className="flex gap-2"><button type="button" className="glass-button" onClick={() => void saveTag(t.id)}>Save</button><button type="button" className="glass-button" onClick={() => setEditingTagId("")}>Cancel</button></div></div> : <div className="flex flex-wrap items-center gap-2"><span className="break-all font-medium">{t.name}</span><button type="button" className="glass-button" onClick={() => { setEditingTagId(t.id); setEditingTagName(t.name); }}>Edit</button><button type="button" className="glass-button" onClick={() => void deleteTag(t.id, t.name)}>Delete</button></div>}
                </div>)}
                {tags.length === 0 && <p className="text-sm text-gray-400">No tags yet.</p>}
              </div>
            </section>
          )}

          {activeSection === "ads" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Advertisement management</h2>
              <p className="mt-2 text-sm text-gray-400">Add direct creatives or paste an ad-network tag from Adsterra and other providers. Network code runs inside a sandboxed ad frame. New ads start paused.</p>
              <form className="mt-5 grid gap-3" onSubmit={e => { e.preventDefault(); void saveAd(); }}>
                <label className="grid gap-2 text-sm text-gray-300">Ad name<input required minLength={2} maxLength={120} value={adName} onChange={e => setAdName(e.target.value)} className="glass-input rounded-xl p-3 text-white" placeholder="Campaign name" /></label>
                <label className="grid gap-2 text-sm text-gray-300">Ad source<select value={adProvider} onChange={e => setAdProvider(e.target.value)} className="glass-input rounded-xl p-3 text-white"><option value="DIRECT">Direct image/video URL</option><option value="ADSTERRA">Adsterra tag</option><option value="ADSENSE">Google AdSense tag</option><option value="PROPELLERADS">PropellerAds tag</option><option value="MONETAG">Monetag tag</option><option value="OTHER">Other ad provider</option></select></label>
                <label className="grid gap-2 text-sm text-gray-300">Placement<select value={adType} onChange={e => setAdType(e.target.value)} className="glass-input rounded-xl p-3 text-white"><option value="BANNER">Banner</option><option value="PRE_ROLL">Pre-roll video (campaign record)</option><option value="MID_ROLL">Mid-roll video (campaign record)</option><option value="POST_ROLL">Post-roll video (campaign record)</option></select></label>
                {adProvider === "DIRECT" ? <label className="grid gap-2 text-sm text-gray-300">Media URL (HTTP/HTTPS)<input required type="url" value={adMediaUrl} onChange={e => setAdMediaUrl(e.target.value)} className="glass-input rounded-xl p-3 text-white" placeholder="https://example.com/banner.jpg" /></label> : <label className="grid gap-2 text-sm text-gray-300">Ad network code / tag<textarea required value={adEmbedCode} onChange={e => setAdEmbedCode(e.target.value)} maxLength={12000} rows={6} className="glass-input rounded-xl p-3 font-mono text-xs text-white" placeholder="Paste the ad tag supplied by your provider" /><span className="text-xs text-gray-500">Paste the tag exactly as provided in your publisher dashboard. Maximum 12,000 characters. Do not paste account passwords or API secrets.</span></label>}
                <label className="grid gap-2 text-sm text-gray-300">Click-through URL (optional)<input type="url" value={adTargetUrl} onChange={e => setAdTargetUrl(e.target.value)} className="glass-input rounded-xl p-3 text-white" placeholder="https://advertiser.example" /></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-gray-300">Start date (optional)<input type="datetime-local" value={adStartAt} onChange={e => setAdStartAt(e.target.value)} className="glass-input rounded-xl p-3 text-white" /></label>
                  <label className="grid gap-2 text-sm text-gray-300">End date (optional)<input type="datetime-local" value={adEndAt} onChange={e => setAdEndAt(e.target.value)} min={adStartAt || undefined} className="glass-input rounded-xl p-3 text-white" /></label>
                </div>
                <div className="flex flex-wrap gap-2"><button className="glass-button w-fit" type="submit">{editingAdId ? "Save advertisement" : "Create advertisement"}</button>{editingAdId && <button className="glass-button w-fit" type="button" onClick={resetAdForm}>Cancel edit</button>}</div>
              </form>
              <div className="mt-7 grid gap-3">
                {ads.map(ad => <article key={ad.id} className="rounded-2xl border border-white/10 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1"><h3 className="break-words font-semibold">{ad.name}</h3><p className="mt-1 text-xs text-gray-400">{ad.type.replaceAll("_", " ")} · {ad.provider || "DIRECT"} · {ad.status}</p>{ad.provider && ad.provider !== "DIRECT" ? <p className="mt-2 text-sm text-cyan-300">Network tag saved · sandboxed banner placement</p> : <p className="mt-2 break-all text-sm text-gray-300">{ad.mediaUrl}</p>}{ad.targetUrl && <p className="mt-1 break-all text-xs text-cyan-300">Click URL: {ad.targetUrl}</p>}<p className="mt-2 text-xs text-gray-500">Impressions: {String(ad.impressions ?? 0)} · Clicks: {String(ad.clicks ?? 0)}</p><p className="mt-1 text-xs text-gray-500">Starts: {ad.startAt ? new Date(ad.startAt).toLocaleString() : "Immediately"} · Ends: {ad.endAt ? new Date(ad.endAt).toLocaleString() : "No end date"}</p></div>
                    <div className="flex flex-wrap gap-2"><button type="button" className="glass-button" onClick={() => editAd(ad)}>Edit</button>{ad.status !== "ACTIVE" && <button type="button" className="glass-button" onClick={() => void changeAdStatus(ad, "ACTIVE")}>Activate</button>}{ad.status !== "PAUSED" && <button type="button" className="glass-button" onClick={() => void changeAdStatus(ad, "PAUSED")}>Pause</button>}{ad.status !== "ARCHIVED" && <button type="button" className="glass-button" onClick={() => void changeAdStatus(ad, "ARCHIVED")}>Archive</button>}<button type="button" className="glass-button" onClick={() => void deleteAd(ad)}>Delete</button></div>
                  </div>
                </article>)}
                {ads.length === 0 && <p className="text-sm text-gray-400">No advertisements yet. Create your first campaign above.</p>}
              </div>
            </section>
          )}

          {activeSection === "audit" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 className="text-2xl font-bold">Audit Logs</h2><p className="mt-2 text-sm text-gray-400">Review recent administrative actions and the account responsible. The API limits this view to the latest 300 entries.</p></div>
                <button type="button" className="glass-button" onClick={() => void load()}>Refresh logs</button>
              </div>
              <label className="mt-5 grid gap-2 text-sm text-gray-300">Search logs<input value={auditSearch} onChange={e => setAuditSearch(e.target.value)} className="glass-input rounded-xl p-3 text-white" placeholder="Search action, account, entity, ID…" /></label>
              <div className="mt-5 grid gap-3">
                {auditLogs.filter(log => [log.action, log.entity, log.entityId, log.actor?.email, log.actor?.name, JSON.stringify(log.metadata || {})].join(" ").toLowerCase().includes(auditSearch.trim().toLowerCase())).map(log => (
                  <article key={log.id} className="rounded-2xl border border-white/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0"><h3 className="break-words font-semibold">{String(log.action || "Action").replaceAll(".", " ")}</h3><p className="mt-1 text-sm text-cyan-300">{log.actor?.name || log.actor?.email || "System / deleted account"}</p></div>
                      <time className="text-xs text-gray-500" dateTime={log.createdAt}>{log.createdAt ? new Date(log.createdAt).toLocaleString() : "Unknown time"}</time>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">Entity: {log.entity || "—"}{log.entityId ? " · ID: " + log.entityId : ""}</p>
                    {log.ip && <p className="mt-1 text-xs text-gray-500">IP: {log.ip}</p>}
                    {log.metadata && <details className="mt-3"><summary className="cursor-pointer text-xs text-gray-400">View action details</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/20 p-3 text-xs text-gray-300">{JSON.stringify(log.metadata, null, 2)}</pre></details>}
                  </article>
                ))}
                {auditLogs.length === 0 && <p className="text-sm text-gray-400">No audit events have been recorded yet.</p>}
                {auditLogs.length > 0 && auditLogs.filter(log => [log.action, log.entity, log.entityId, log.actor?.email, log.actor?.name, JSON.stringify(log.metadata || {})].join(" ").toLowerCase().includes(auditSearch.trim().toLowerCase())).length === 0 && <p className="text-sm text-gray-400">No logs match that search.</p>}
              </div>
            </section>
          )}

          {!availableSections.includes(activeSection) && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <p className="text-xs uppercase tracking-[.2em] text-cyan-300">Planned feature</p>
              <h2 className="mt-2 text-2xl font-bold">{sections.find(s => s.id === activeSection)?.label}</h2>
              <p className="mt-3 text-sm text-gray-400">This section has a menu entry, but its complete backend and save actions are not yet connected. It is intentionally not pretending to be functional. We will implement and test it separately without changing video playback, upload, or authentication.</p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
