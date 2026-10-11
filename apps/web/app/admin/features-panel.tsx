"use client";

import { useEffect, useState } from "react";

type Props = { section: string; onMessage: (message: string) => void };

const labels: Record<string, string> = {
  playlists: "Playlist Management", pages: "Pages & Posts", comments: "Comment Moderation",
  roles: "Roles & Permissions", subscriptions: "Subscriptions", revenue: "Revenue Reports",
  analytics: "Analytics", website: "Website Editor", navigation: "Site Navigation",
  theme: "Theme & Branding", storage: "Storage & CDN", processing: "Processing Queue",
  notifications: "Notifications", settings: "System Settings",
};
const configSections = new Set(["website", "navigation", "theme", "settings"]);
const endpoint: Record<string, string> = {
  playlists: "/v1/admin/playlists", pages: "/v1/admin/pages", comments: "/v1/admin/comments",
  roles: "/v1/admin/roles", subscriptions: "/v1/admin/subscriptions", revenue: "/v1/admin/revenue",
  analytics: "/v1/admin/analytics", website: "/v1/admin/website", navigation: "/v1/admin/navigation",
  theme: "/v1/admin/theme", storage: "/v1/admin/storage", processing: "/v1/admin/processing",
  settings: "/v1/admin/settings",
};

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch("/api" + path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || result.error || "Request failed");
  return result.data;
}

function PanelCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">{children}</div>;
}
function Field({ label, value, onChange, placeholder = "", multiline = false }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return <label className="grid gap-1.5 text-sm text-gray-300">{label}
    {multiline
      ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} className="glass-input w-full rounded-xl p-3 text-white" />
      : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="glass-input w-full rounded-xl p-3 text-white" />}
  </label>;
}
function Button({ children, onClick, secondary = false }: { children: React.ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button type="button" onClick={onClick} className={"glass-button " + (secondary ? "opacity-80 " : "")}>{children}</button>;
}

export default function AdminFeaturePanel({ section, onMessage }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jsonText, setJsonText] = useState("{}");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState("PAGE");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [userId, setUserId] = useState("");
  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("0");
  const [currency, setCurrency] = useState("USD");
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeBody, setNoticeBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true); setError("");
    try {
      const path = endpoint[section];
      if (!path) throw new Error("This admin section has no API endpoint yet.");
      const result = await request(path);
      setData(result);
      if (configSections.has(section)) setJsonText(JSON.stringify(section === "navigation" ? { items: result } : result, null, 2));
    } catch (e: any) { setError(e.message || "Could not load this section"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [section]);

  async function act(work: () => Promise<unknown>, success: string) {
    setBusy(true); setError("");
    try { await work(); onMessage(success); await load(); }
    catch (e: any) { setError(e.message || "Action failed"); onMessage(e.message || "Action failed"); }
    finally { setBusy(false); }
  }

  async function saveConfig() {
    let parsed: any;
    try { parsed = JSON.parse(jsonText); } catch { setError("Please enter valid JSON."); return; }
    const path = endpoint[section];
    if (!path) { setError("This admin section has no API endpoint yet."); return; }
    await act(async () => request(path, { method: "PATCH", body: JSON.stringify(parsed) }), "Settings saved.");
  }
  async function createPage() {
    await act(async () => request("/v1/admin/pages", { method: "POST", body: JSON.stringify({ title, slug: slug || title, kind, excerpt, body }) }), "Draft created.");
    setTitle(""); setSlug(""); setExcerpt(""); setBody("");
  }

  if (loading) return <section className="glass-panel rounded-3xl p-5"><h2 className="text-xl font-bold">{labels[section] || section}</h2><p className="mt-3 text-sm text-gray-400">Loading backend data…</p></section>;

  return <section className="glass-panel min-w-0 rounded-3xl p-4 sm:p-6">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">{labels[section] || section}</h2><p className="mt-1 text-sm text-gray-400">Connected to the YourTab API.</p></div>
      <Button secondary onClick={() => void load()}>Refresh</Button>
    </div>
    {error && <div role="alert" className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}

    {configSections.has(section) && <div className="grid gap-3">
      <p className="text-sm text-gray-400">{section === "settings" ? "Only supported application settings are editable here. Secret keys are never displayed." : section === "navigation" ? "Edit the list of navigation links as JSON. Use site-relative paths or HTTPS links only." : "Edit the saved configuration as JSON. Changes are stored in PlatformMetadata; the live website must read these values to reflect them visually."}</p>
      <Field label="Configuration JSON" value={jsonText} onChange={setJsonText} multiline />
      <div><Button onClick={() => void saveConfig()}>{busy ? "Saving…" : "Save changes"}</Button></div>
    </div>}

    {section === "storage" && <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(data || {}).map(([key, value]) => <PanelCard key={key}><p className="text-xs uppercase text-gray-500">{key}</p><p className="mt-2 break-words text-sm text-gray-100">{String(value ?? "Not configured")}</p></PanelCard>)}
    </div>}

    {section === "pages" && <div className="grid gap-5">
      <PanelCard><h3 className="mb-3 font-semibold">Create page or post (saved as draft)</h3><div className="grid gap-3">
        <Field label="Title" value={title} onChange={setTitle} placeholder="Page or post title" />
        <Field label="Slug (optional)" value={slug} onChange={setSlug} placeholder="about-us" />
        <label className="grid gap-1.5 text-sm text-gray-300">Content type<select value={kind} onChange={e => setKind(e.target.value)} className="glass-input rounded-xl p-3 text-white"><option value="PAGE">Page</option><option value="POST">Post</option></select></label>
        <Field label="Excerpt" value={excerpt} onChange={setExcerpt} />
        <Field label="Body" value={body} onChange={setBody} multiline />
        <div><Button onClick={() => void createPage()}>{busy ? "Saving…" : "Create draft"}</Button></div>
      </div></PanelCard>
      <div className="grid gap-3">{(Array.isArray(data) ? data : []).map((item: any) => <PanelCard key={item.id}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{item.title}</h3><p className="text-xs text-gray-400">/{item.slug} · {item.kind} · {item.status}</p></div>
          <div className="flex flex-wrap gap-2"><Button secondary onClick={() => void act(() => request("/v1/admin/pages/" + item.id, { method: "PATCH", body: JSON.stringify({ status: item.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED" }) }), "Content status updated.")}>{item.status === "PUBLISHED" ? "Unpublish" : "Publish"}</Button><Button secondary onClick={() => { if (window.confirm("Delete this page/post?")) void act(() => request("/v1/admin/pages/" + item.id, { method: "DELETE" }), "Content deleted."); }}>Delete</Button></div>
        </div><p className="mt-2 whitespace-pre-wrap break-words text-sm text-gray-300">{item.excerpt || item.body?.slice(0, 240)}</p>
      </PanelCard>)}</div>
    </div>}

    {section === "comments" && <div className="grid gap-3">{(Array.isArray(data) ? data : []).map((item: any) => <PanelCard key={item.id}>
      <div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{item.user?.name || item.user?.email || "User"} · {item.video?.title || "Video"}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-300">{item.body}</p><p className="mt-2 text-xs text-gray-500">{new Date(item.createdAt).toLocaleString()} · {item.status}</p></div>
      <div className="flex flex-wrap gap-2">{["APPROVED", "PENDING", "HIDDEN"].map(status => <Button key={status} secondary onClick={() => void act(() => request("/v1/admin/comments/" + item.id, { method: "PATCH", body: JSON.stringify({ status }) }), "Comment status updated.")}>{status}</Button>)}<Button secondary onClick={() => { if (window.confirm("Delete this comment?")) void act(() => request("/v1/admin/comments/" + item.id, { method: "DELETE" }), "Comment deleted."); }}>Delete</Button></div></div>
    </PanelCard>)}</div>}

    {section === "roles" && <div className="grid gap-3">{(Array.isArray(data) ? data : data?.data || []).map((role: any) => <PanelCard key={role.role}><h3 className="font-semibold">{role.role}</h3><p className="mt-1 text-sm text-gray-400">{role.description}</p><div className="mt-3 flex flex-wrap gap-2">{role.permissions?.map((permission: string) => <span key={permission} className="rounded-full bg-white/10 px-2 py-1 text-xs">{permission}</span>)}</div></PanelCard>)}<p className="text-sm text-gray-400">Role assignments are changed from User Management. This page shows the current built-in policy; custom roles are not enabled.</p></div>}

    {section === "subscriptions" && <div className="grid gap-4">
      <PanelCard><h3 className="mb-3 font-semibold">Record a manual subscription</h3><div className="grid gap-3 sm:grid-cols-2">
        <Field label="User ID" value={userId} onChange={setUserId} /><Field label="Plan name" value={planName} onChange={setPlanName} />
        <Field label="Amount (minor units, e.g. cents)" value={amount} onChange={setAmount} /><Field label="Currency" value={currency} onChange={setCurrency} />
        <div className="sm:col-span-2"><Button onClick={() => void act(() => request("/v1/admin/subscriptions", { method: "POST", body: JSON.stringify({ userId, planName, amountCents: Number(amount), currency }) }), "Subscription recorded.")}>Record subscription</Button></div>
      </div><p className="mt-2 text-xs text-amber-200">This records admin-entered subscription data; it does not charge a payment method.</p></PanelCard>
      <div className="grid gap-3">{(Array.isArray(data) ? data : []).map((item: any) => <PanelCard key={item.id}><div className="flex flex-wrap justify-between gap-2"><div><p className="font-semibold">{item.planName} · {item.user?.email}</p><p className="text-sm text-gray-400">{item.currency} {(item.amountCents / 100).toFixed(2)} · {item.status}</p></div><div className="flex flex-wrap gap-2">{["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"].map(status => <Button key={status} secondary onClick={() => void act(() => request("/v1/admin/subscriptions/" + item.id, { method: "PATCH", body: JSON.stringify({ status }) }), "Subscription status updated.")}>{status}</Button>)}</div></div></PanelCard>)}</div>
    </div>}

    {(section === "analytics" || section === "revenue") && <div className="grid gap-4">
      {Object.entries(data || {}).map(([key, value]) => <PanelCard key={key}><h3 className="mb-2 font-semibold">{key}</h3>{Array.isArray(value) ? <div className="grid gap-2">{value.slice(0, 100).map((row: any, i: number) => <pre key={row.id || row.date || i} className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-gray-300">{JSON.stringify(row, null, 2)}</pre>)}</div> : <pre className="overflow-x-auto whitespace-pre-wrap break-words text-sm text-gray-300">{JSON.stringify(value, null, 2)}</pre>}</PanelCard>)}
    </div>}

    {section === "processing" && <div className="grid gap-3">{(Array.isArray(data) ? data : []).map((job: any) => <PanelCard key={job.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{job.video?.title || job.videoId}</p><p className="text-xs text-gray-400">{job.status} · {job.progress}% · attempts {job.attempts}</p>{job.error && <p className="mt-1 break-words text-sm text-red-300">{job.error}</p>}</div>
      <Button secondary onClick={() => void act(() => request("/v1/admin/processing/" + job.id + "/retry", { method: "POST" }), "Processing job queued for retry.")}>Retry job</Button></div>
    </PanelCard>)}</div>}

    {section === "playlists" && <div className="grid gap-3">{(Array.isArray(data) ? data : []).map((item: any) => <PanelCard key={item.id}>
      <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-gray-400">{item.user?.email} · {item.items?.length || 0} videos · {item.isPublic ? "Public" : "Private"}</p></div><div className="flex gap-2"><Button secondary onClick={() => void act(() => request("/v1/admin/playlists/" + item.id, { method: "PATCH", body: JSON.stringify({ isPublic: !item.isPublic }) }), "Playlist visibility updated.")}>{item.isPublic ? "Make private" : "Make public"}</Button><Button secondary onClick={() => { if (window.confirm("Delete this playlist?")) void act(() => request("/v1/admin/playlists/" + item.id, { method: "DELETE" }), "Playlist deleted."); }}>Delete</Button></div></div>
    </PanelCard>)}</div>}

    {section === "notifications" && <PanelCard><h3 className="mb-3 font-semibold">Send notification to all active users</h3><div className="grid gap-3">
      <Field label="Notification title" value={noticeTitle} onChange={setNoticeTitle} />
      <Field label="Message" value={noticeBody} onChange={setNoticeBody} multiline />
      <div><Button onClick={() => void act(() => request("/v1/admin/notifications/broadcast", { method: "POST", body: JSON.stringify({ title: noticeTitle, body: noticeBody }) }), "Notification sent to active users.")}>Send broadcast</Button></div>
    </div></PanelCard>}
  </section>;
}
