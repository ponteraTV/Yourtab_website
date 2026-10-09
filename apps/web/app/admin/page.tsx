"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
type Section = "overview" | "videos" | "users" | "ads" | "editor" | "settings" | "audit";

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

const nav: { id: Section; label: string; icon: string; description: string }[] = [
  { id: "overview", label: "Overview", icon: "▦", description: "Platform health and key metrics" },
  { id: "videos", label: "Videos", icon: "▶", description: "Upload and moderate videos" },
  { id: "users", label: "Users", icon: "♙", description: "Manage accounts and permissions" },
  { id: "ads", label: "Advertisements", icon: "▤", description: "Campaigns and ad delivery status" },
  { id: "editor", label: "Website editor", icon: "✎", description: "Edit homepage text and branding" },
  { id: "settings", label: "Settings", icon: "⚙", description: "Platform controls" },
  { id: "audit", label: "Audit logs", icon: "☷", description: "Review administrative changes" },
];

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [section, setSection] = useState<Section>("overview");
  const [msg, setMsg] = useState("");
  const [upload, setUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [adForm, setAdForm] = useState({ name: "", type: "BANNER", mediaUrl: "", targetUrl: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setDenied(false);
    try {
      const m = await api("/v1/auth/me");
      if (!m || !["ADMIN", "MODERATOR"].includes(m.role)) {
        setMe(null); setDenied(true); setMsg(m ? "Admin access required" : "Sign in required"); return;
      }
      setMe(m);
      const results = await Promise.all([
        api("/v1/admin/stats"),
        api("/v1/admin/users"),
        api("/v1/admin/videos"),
        api("/v1/admin/ads"),
        api("/v1/admin/settings"),
        api("/v1/admin/audit"),
      ]);
      setStats(results[0]); setUsers(results[1]); setVideos(results[2]);
      setAds(results[3]); setSettings(results[4] || {}); setAudit(results[5] || []);
      setMsg("");
    } catch (e: any) {
      setMe(null); setDenied(true); setMsg(e.message || "Sign in required");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  async function file(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !me) return;
    const title = f.name.replace(/\.[^.]+$/, "");
    const extension = f.name.split(".").pop()?.toLowerCase() || "";
    const knownVideoTypes: Record<string, string> = { mp4: "video/mp4", m4v: "video/x-m4v", mov: "video/quicktime", webm: "video/webm", mkv: "video/x-matroska", avi: "video/x-msvideo", mpg: "video/mpeg", mpeg: "video/mpeg", "3gp": "video/3gpp" };
    const contentType = f.type.startsWith("video/") ? f.type : knownVideoTypes[extension];
    if (!contentType) { setMsg("Unsupported video type. Choose MP4, MOV, WebM, MKV, AVI, MPEG, or 3GP."); return; }
    setUpload(true); setMsg("Uploading and queueing video…");
    try {
      const p = await api("/v1/uploads/presign", { method: "POST", body: JSON.stringify({ filename: f.name, contentType }) });
      const put = await fetch(p.url, { method: "PUT", headers: { "Content-Type": contentType }, body: f });
      if (!put.ok) throw new Error((await put.text().catch(() => "")) || "Storage upload failed. Check storage URL/CORS.");
      await api("/v1/videos", { method: "POST", body: JSON.stringify({ title, sourceKey: p.key }) });
      setMsg("Video uploaded and queued. Worker will transcode it to HLS."); await load();
    } catch (e: any) { setMsg(e.message || "Video upload failed"); }
    finally { setUpload(false); }
  }

  async function user(id: string, status: string, role: string) {
    try { await api("/v1/admin/users/" + id, { method: "PATCH", body: JSON.stringify({ status, role }) }); setMsg("User updated."); await load(); }
    catch (e: any) { setMsg(e.message || "User update failed"); }
  }
  async function video(id: string, status: string) {
    try { await api("/v1/admin/videos/" + id, { method: "PATCH", body: JSON.stringify({ status }) }); setMsg("Video updated."); await load(); }
    catch (e: any) { setMsg(e.message || "Video update failed"); }
  }
  async function createAd(e: FormEvent) {
    e.preventDefault(); setSaving(true);
    try {
      await api("/v1/admin/ads", { method: "POST", body: JSON.stringify(adForm) });
      setAdForm({ name: "", type: "BANNER", mediaUrl: "", targetUrl: "" });
      setMsg("Ad campaign created in PAUSED status. Review it before activating."); await load();
    } catch (e: any) { setMsg(e.message || "Could not create advertisement"); }
    finally { setSaving(false); }
  }
  async function adStatus(id: string, status: string) {
    try { await api("/v1/admin/ads/" + id, { method: "PATCH", body: JSON.stringify({ status }) }); setMsg("Advertisement status updated."); await load(); }
    catch (e: any) { setMsg(e.message || "Advertisement update failed"); }
  }
  async function saveSettings(keys: string[]) {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      keys.forEach(k => payload[k] = settings[k] || "");
      const saved = await api("/v1/admin/settings", { method: "PATCH", body: JSON.stringify(payload) });
      setSettings(prev => ({ ...prev, ...saved })); setMsg("Changes saved.");
      await load();
    } catch (e: any) { setMsg(e.message || "Could not save settings"); }
    finally { setSaving(false); }
  }

  if (loading) return <main className="min-h-screen p-8"><div className="glass-panel mx-auto max-w-xl rounded-3xl p-8"><h1 className="text-3xl font-bold">YourTab Admin</h1><p className="mt-3 text-gray-400">Checking administrator session…</p></div></main>;
  if (denied || !me) return <main className="min-h-screen p-8"><div className="glass-panel mx-auto max-w-xl rounded-3xl p-8"><h1 className="text-3xl font-bold">Admin login required</h1><p className="mt-3 text-red-300">{msg || "Please sign in with an ADMIN or MODERATOR account first."}</p><a href="/#account" className="mt-6 inline-block glass-button">Sign in</a><a href="/" className="ml-3 mt-6 inline-block glass-button">Back to YourTab</a></div></main>;

  const field = (key: string, label: string, placeholder = "") => (
    <label key={key} className="block"><span className="mb-2 block text-sm text-gray-400">{label}</span>
      <input className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={settings[key] || ""} placeholder={placeholder} onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))} />
    </label>
  );
  const boolField = (key: string, label: string) => (
    <label key={key} className="flex items-center justify-between gap-4 rounded-xl border border-white/10 p-4"><span>{label}</span>
      <input type="checkbox" checked={(settings[key] ?? (key === "system.registrationEnabled" || key === "system.uploadsEnabled" ? "true" : "false")) === "true"} onChange={e => setSettings(s => ({ ...s, [key]: String(e.target.checked) }))} />
    </label>
  );

  return (
    <main className="min-h-screen lg:flex">
      <aside className="border-b border-white/10 bg-black/20 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:p-5">
        <a href="/" className="block px-3 py-2"><p className="text-xs uppercase tracking-[.25em] text-cyan-300">Control center</p><h1 className="mt-1 text-2xl font-black">YourTab Admin</h1></a>
        <p className="px-3 pb-4 pt-2 text-xs text-gray-500">{me.email} · {me.role}</p>
        <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
          {nav.map(item => <button key={item.id} onClick={() => { setSection(item.id); setMsg(""); }} className={"flex items-center gap-3 rounded-xl px-4 py-3 text-left transition " + (section === item.id ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30" : "text-gray-300 hover:bg-white/5")}><span className="w-5 text-center text-lg">{item.icon}</span><span className="text-sm font-semibold">{item.label}</span></button>)}
        </nav>
        <a href="/" className="mt-4 hidden rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-300 lg:block">← View website</a>
      </aside>

      <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[.22em] text-cyan-300">Administration</p><h2 className="mt-1 text-3xl font-black sm:text-4xl">{nav.find(n => n.id === section)?.label}</h2><p className="mt-2 text-sm text-gray-400">{nav.find(n => n.id === section)?.description}</p></div><button className="glass-button" onClick={load}>Refresh data</button></header>
        {msg && <div className="mb-6 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">{msg}</div>}

        {section === "overview" && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Object.entries(stats || {}).map(([k,v]) => <div key={k} className="glass-panel rounded-2xl p-5"><p className="text-xs uppercase tracking-wider text-gray-500">{k}</p><p className="mt-3 text-3xl font-bold">{String(v)}</p></div>)}<div className="glass-panel rounded-2xl p-5 sm:col-span-2 xl:col-span-4"><h3 className="text-lg font-bold">Quick actions</h3><div className="mt-4 flex flex-wrap gap-2">{nav.filter(n => n.id !== "overview").map(n => <button key={n.id} className="glass-button" onClick={() => setSection(n.id)}>{n.icon} {n.label}</button>)}</div></div></div>}

        {section === "videos" && <div className="space-y-6"><div className="glass-panel rounded-2xl p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-xl font-bold">Upload video</h3><p className="mt-1 text-sm text-gray-400">Upload to storage; the worker processes it to HLS.</p></div><label className={"glass-button cursor-pointer " + (upload ? "opacity-50" : "")}><input disabled={upload} type="file" accept="video/*" className="hidden" onChange={file}/>{upload ? "Uploading…" : "Choose video"}</label></div></div><div className="glass-panel overflow-x-auto rounded-2xl p-5"><h3 className="mb-4 text-xl font-bold">Video library</h3><table className="w-full min-w-[600px] text-left text-sm"><thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Views</th><th className="p-3">Action</th></tr></thead><tbody>{videos.map(v => <tr key={v.id} className="border-b border-white/5"><td className="p-3">{v.title}</td><td className="p-3">{v.status}</td><td className="p-3">{Number(v.views)}</td><td className="p-3">{v.status === "PROCESSING" ? "Processing…" : <div className="flex gap-2">{v.status !== "BLOCKED" && <button className="glass-button" onClick={() => video(v.id,"BLOCKED")}>Block</button>}{v.status === "BLOCKED" && <button className="glass-button" onClick={() => video(v.id,"READY")}>Unblock / publish</button>}</div>}</td></tr>)}</tbody></table></div></div>}

        {section === "users" && <div className="glass-panel overflow-x-auto rounded-2xl p-5"><h3 className="mb-4 text-xl font-bold">User accounts</h3><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead><tbody>{users.map(u => <tr key={u.id} className="border-b border-white/5"><td className="p-3">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3">{u.role}</td><td className="p-3">{u.status}</td><td className="p-3"><div className="flex gap-2"><button className="glass-button" onClick={() => user(u.id,u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED",u.role)}>{u.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>{me.role === "ADMIN" && <button className="glass-button" onClick={() => user(u.id,u.status,u.role === "ADMIN" ? "USER" : "ADMIN")}>{u.role === "ADMIN" ? "Make user" : "Make admin"}</button>}</div></td></tr>)}</tbody></table></div>}

        {section === "ads" && <div className="space-y-6"><form onSubmit={createAd} className="glass-panel grid gap-4 rounded-2xl p-5 md:grid-cols-2"><h3 className="text-xl font-bold md:col-span-2">Create advertisement</h3><label className="block text-sm text-gray-400">Campaign name<input required className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={adForm.name} onChange={e => setAdForm(s => ({...s,name:e.target.value}))}/></label><label className="block text-sm text-gray-400">Ad placement<select className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={adForm.type} onChange={e => setAdForm(s => ({...s,type:e.target.value}))}><option value="BANNER">Banner</option><option value="PRE_ROLL">Before video</option><option value="MID_ROLL">During video</option><option value="POST_ROLL">After video</option></select></label><label className="block text-sm text-gray-400">Image / video media URL<input required type="url" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={adForm.mediaUrl} onChange={e => setAdForm(s => ({...s,mediaUrl:e.target.value}))}/></label><label className="block text-sm text-gray-400">Destination URL (optional)<input type="url" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={adForm.targetUrl} onChange={e => setAdForm(s => ({...s,targetUrl:e.target.value}))}/></label><div className="md:col-span-2"><button disabled={saving} className="glass-button">{saving ? "Saving…" : "Create paused campaign"}</button><p className="mt-2 text-xs text-gray-500">New campaigns are created paused. Activating a campaign here changes its status; ad delivery and impression tracking must also be wired into playback to serve ads.</p></div></form><div className="glass-panel overflow-x-auto rounded-2xl p-5"><h3 className="mb-4 text-xl font-bold">Campaigns</h3><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Name</th><th className="p-3">Placement</th><th className="p-3">Status</th><th className="p-3">Impressions</th><th className="p-3">Clicks</th><th className="p-3">Action</th></tr></thead><tbody>{ads.map(a => <tr key={a.id} className="border-b border-white/5"><td className="p-3">{a.name}</td><td className="p-3">{a.type}</td><td className="p-3">{a.status}</td><td className="p-3">{Number(a.impressions || 0)}</td><td className="p-3">{Number(a.clicks || 0)}</td><td className="p-3"><button className="glass-button" onClick={() => adStatus(a.id,a.status === "ACTIVE" ? "PAUSED" : "ACTIVE")}>{a.status === "ACTIVE" ? "Pause" : "Activate"}</button></td></tr>)}</tbody></table></div></div>}

        {section === "editor" && <div className="glass-panel rounded-2xl p-5"><h3 className="text-xl font-bold">Homepage content</h3><p className="mb-6 mt-2 text-sm text-gray-400">Edit the site text values saved in platform metadata. The public homepage must read these keys for changes to appear there.</p><div className="grid gap-4 md:grid-cols-2">{field("site.title","Site title","YourTab")}{field("site.tagline","Tagline","Your videos, your world")}{field("site.heroTitle","Homepage headline","Watch what you love")}{field("site.announcement","Announcement bar","Optional announcement")}{field("site.primaryColor","Brand accent color","#22d3ee")}<label className="block"><span className="mb-2 block text-sm text-gray-400">Homepage description</span><textarea rows={4} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white" value={settings["site.heroDescription"] || ""} onChange={e => setSettings(s => ({...s,"site.heroDescription":e.target.value}))}/></label></div><button disabled={saving} className="glass-button mt-6" onClick={() => saveSettings(["site.title","site.tagline","site.heroTitle","site.heroDescription","site.announcement","site.primaryColor"])}>{saving ? "Saving…" : "Save website content"}</button></div>}

        {section === "settings" && <div className="glass-panel rounded-2xl p-5"><h3 className="text-xl font-bold">Platform controls</h3><p className="mb-6 mt-2 text-sm text-gray-400">These values are saved in the database. Registration, uploads and maintenance behavior must be enforced by the relevant public API routes before these switches can control runtime behavior.</p><div className="space-y-3">{boolField("system.registrationEnabled","Allow new registrations")}{boolField("system.uploadsEnabled","Allow video uploads")}{boolField("system.maintenanceMode","Maintenance mode")}</div><button disabled={saving} className="glass-button mt-6" onClick={() => saveSettings(["system.registrationEnabled","system.uploadsEnabled","system.maintenanceMode"])}>{saving ? "Saving…" : "Save platform settings"}</button></div>}

        {section === "audit" && <div className="glass-panel overflow-x-auto rounded-2xl p-5"><h3 className="mb-4 text-xl font-bold">Administrative activity</h3><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Time</th><th className="p-3">Actor</th><th className="p-3">Action</th><th className="p-3">Entity</th><th className="p-3">Details</th></tr></thead><tbody>{audit.map(a => <tr key={a.id} className="border-b border-white/5"><td className="p-3">{new Date(a.createdAt).toLocaleString()}</td><td className="p-3">{a.actor?.email || "System"}</td><td className="p-3">{a.action}</td><td className="p-3">{a.entity}{a.entityId ? " · " + a.entityId : ""}</td><td className="p-3">{a.metadata ? JSON.stringify(a.metadata) : "—"}</td></tr>)}</tbody></table>{audit.length === 0 && <p className="py-5 text-sm text-gray-500">No audit entries recorded yet.</p>}</div>}
      </section>
    </main>
  );
}
