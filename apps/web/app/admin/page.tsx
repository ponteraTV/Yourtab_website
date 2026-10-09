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

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-cyan-300 text-sm uppercase tracking-[.25em]">Control center</p>
          <h1 className="text-4xl font-black">YourTab Admin</h1>
          <p className="mt-2 text-sm text-gray-400">{me.email} · {me.role}</p>
        </div>
        <a href="/" className="glass-button">View website</a>
      </div>

      {msg && <div className="my-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">{msg}</div>}

      {stats && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="glass-panel rounded-2xl p-5">
              <p className="text-sm uppercase text-gray-500">{k}</p>
              <p className="mt-2 text-3xl font-bold">{String(v)}</p>
            </div>
          ))}
        </div>
      )}

      <section className="mt-10 glass-panel rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Video upload</h2>
            <p className="text-sm text-gray-400">Upload directly to storage; the worker creates HLS.</p>
          </div>
          <label className={"glass-button cursor-pointer " + (upload ? "opacity-50" : "")}>
            <input disabled={upload} type="file" accept="video/*" className="hidden" onChange={file} />
            {upload ? "Uploading…" : "Choose video"}
          </label>
        </div>
      </section>

      <section className="mt-8 glass-panel rounded-3xl p-6 overflow-x-auto">
        <h2 className="mb-4 text-2xl font-bold">Videos</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Title</th><th className="p-3">Status</th><th className="p-3">Views</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {videos.map(v => (
              <tr key={v.id} className="border-b border-white/5">
                <td className="p-3">{v.title}</td>
                <td className="p-3">{v.status}</td>
                <td className="p-3">{Number(v.views)}</td>
                <td className="p-3 flex gap-2">
                  {v.status === "PROCESSING" && <span className="text-xs text-gray-500">Processing…</span>}
                  {v.status === "READY" && <button className="glass-button" onClick={() => video(v.id, "BLOCKED")}>Block</button>}
                  {v.status === "DRAFT" && <button className="glass-button" onClick={() => video(v.id, "BLOCKED")}>Block</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-8 glass-panel rounded-3xl p-6 overflow-x-auto">
        <h2 className="mb-4 text-2xl font-bold">Users</h2>
        <table className="w-full text-left text-sm">
          <thead><tr className="border-b border-white/10 text-gray-500"><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Action</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{u.role}</td>
                <td className="p-3">{u.status}</td>
                <td className="p-3 flex gap-2">
                  <button className="glass-button" onClick={() => user(u.id, u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED", u.role)}>{u.status === "SUSPENDED" ? "Activate" : "Suspend"}</button>
                  <button className="glass-button" onClick={() => user(u.id, u.status, u.role === "ADMIN" ? "USER" : "ADMIN")}>{u.role === "ADMIN" ? "Make user" : "Make admin"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
