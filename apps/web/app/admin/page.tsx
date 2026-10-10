"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

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

export default function AdminPage() {
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>();
  const [users, setUsers] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [upload, setUpload] = useState(false);
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

  async function file(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !me) return;
    const title = f.name.replace(/\.[^.]+$/, "");
    // Some browsers report an empty File.type for valid video files.
    // Keep the signed Content-Type identical between presign and PUT.
    const extension = f.name.split(".").pop()?.toLowerCase() || "";
    const knownVideoTypes: Record<string, string> = {
      mp4: "video/mp4",
      m4v: "video/x-m4v",
      mov: "video/quicktime",
      webm: "video/webm",
      mkv: "video/x-matroska",
      avi: "video/x-msvideo",
      mpg: "video/mpeg",
      mpeg: "video/mpeg",
      "3gp": "video/3gpp",
    };
    const contentType = f.type.startsWith("video/") ? f.type : knownVideoTypes[extension];
    if (!contentType) {
      setMsg("Unsupported video type. Please choose MP4, MOV, WebM, MKV, AVI, MPEG, or 3GP.");
      return;
    }
    setUpload(true);
    setMsg("Uploading and queueing video…");
    try {
      const p = await api("/v1/uploads/presign", {
        method: "POST",
        body: JSON.stringify({ filename: f.name, contentType }),
      });
      const put = await fetch(p.url, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body: f,
      });
      if (!put.ok) {
        const detail = await put.text().catch(() => "");
        throw new Error(detail || "Storage upload failed. Check storage URL/CORS.");
      }
      await api("/v1/videos", {
        method: "POST",
        body: JSON.stringify({ title, sourceKey: p.key }),
      });
      setMsg("Video uploaded and queued. Worker will transcode it to HLS.");
      await load();
    } catch (e: any) {
      setMsg(e.message || "Video upload failed");
    } finally {
      setUpload(false);
    }
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
  const availableSections = ["dashboard", "upload", "videos", "users"];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-5 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-cyan-300 text-xs uppercase tracking-[.25em]">Control center</p>
          <h1 className="text-3xl font-black sm:text-4xl">YourTab Admin</h1>
          <p className="mt-2 text-sm text-gray-400">{me.email} · {me.role}</p>
        </div>
        <a href="/" className="glass-button">View website</a>
      </div>

      {msg && <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm" role="status">{msg}</div>}

      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit rounded-2xl p-3">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Admin menu</p>
          <nav aria-label="Admin sections" className="flex flex-col gap-3">
            {menuGroups.map((group) => (
              <div key={group.label} className="min-w-0">
                <p className="px-3 pb-1 text-[10px] font-bold tracking-[.16em] text-gray-500">{group.label}</p>
                <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
                  {group.items.map((section) => {
                    const active = activeSection === section.id;
                    const available = availableSections.includes(section.id);
                    return (
                      <button
                        key={section.id}
                        type="button"
                        onClick={() => setActiveSection(section.id)}
                        aria-current={active ? "page" : undefined}
                        className={"flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition " +
                          (active ? "bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-300/30 " : "text-gray-300 hover:bg-white/5 ") +
                          (!available ? "opacity-80 " : "")}
                      >
                        <span aria-hidden="true" className="w-5 text-center text-base">{section.icon}</span>
                        <span>{section.label}</span>
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

          {activeSection === "upload" && (
            <section className="glass-panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-2xl font-bold">Video upload</h2>
              <p className="mt-2 text-sm text-gray-400">Upload directly to storage; the worker creates HLS. Keep this page open until upload finishes.</p>
              <label className={"mt-6 inline-flex glass-button cursor-pointer " + (upload ? "pointer-events-none opacity-50" : "")}>
                <input disabled={upload} type="file" accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.mpeg,.mpg,.3gp" className="hidden" onChange={file} />
                {upload ? "Uploading…" : "Choose video"}
              </label>
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
                      <td className="p-3">{v.status}</td>
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
