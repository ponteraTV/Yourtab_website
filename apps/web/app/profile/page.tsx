"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";

type Profile = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN" | "MODERATOR";
  status: string;
  createdAt?: string;
  lastLoginAt?: string | null;
};

async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = Array.isArray(json.message) ? json.message.join(", ") : json.message;
    throw new Error(message || json.error || "Request failed");
  }
  return json.data;
}

const inputClass = "mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api("/v1/auth/me")
      .then((data: Profile) => {
        if (!active) return;
        setProfile(data);
        setName(data.name || "");
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Please sign in to view your profile.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setMessage("");
    try {
      const updated = await api("/v1/auth/profile", { method: "PATCH", body: JSON.stringify({ name: name.trim() }) });
      setProfile(updated);
      setName(updated.name);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setSavingPassword(true);
    try {
      await api("/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password changed successfully. Your session has been refreshed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) return <main className="mx-auto max-w-3xl px-4 py-12"><section className="glass-panel rounded-3xl p-8">Loading your profile…</section></main>;

  if (!profile) return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-12">
      <section className="glass-panel w-full rounded-3xl p-8">
        <h1 className="text-3xl font-black">Sign in required</h1>
        <p className="mt-3 text-gray-400">{error || "Sign in to view and manage your profile."}</p>
        <Link href="/login" className="glass-button mt-6 inline-flex">Sign in</Link>
        <Link href="/" className="glass-button ml-3 mt-6 inline-flex">Back to YourTab</Link>
      </section>
    </main>
  );

  const canAccessAdmin = profile.role === "ADMIN" || profile.role === "MODERATOR";

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/" className="text-sm text-cyan-300 hover:text-cyan-200">← Back to YourTab</Link>
          <p className="mt-5 text-xs font-bold uppercase tracking-[.25em] text-cyan-300">Account settings</p>
          <h1 className="mt-2 text-4xl font-black">{canAccessAdmin ? "Admin Profile" : "My Profile"}</h1>
          <p className="mt-2 text-gray-400">Manage your account details and password securely.</p>
        </div>
        {canAccessAdmin && <Link href="/admin" className="glass-button">Open Admin Dashboard →</Link>}
      </header>

      {message && <p role="status" className="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{message}</p>}
      {error && <p role="alert" className="mb-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold">Profile information</h2>
          <p className="mt-1 text-sm text-gray-400">Your email and account role are protected account details.</p>
          <div className="mt-6 space-y-4 text-sm">
            <div><p className="text-gray-500">Email address</p><p className="mt-1 break-all font-medium">{profile.email}</p></div>
            <div><p className="text-gray-500">Account role</p><p className="mt-1 font-medium">{profile.role}</p></div>
            <div><p className="text-gray-500">Account status</p><p className="mt-1 font-medium">{profile.status}</p></div>
            {profile.createdAt && <div><p className="text-gray-500">Member since</p><p className="mt-1 font-medium">{new Date(profile.createdAt).toLocaleDateString()}</p></div>}
          </div>
          <form onSubmit={saveProfile} className="mt-7 border-t border-white/10 pt-6">
            <label className="block text-sm font-medium text-gray-300">Display name<input required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} className={inputClass} autoComplete="name" /></label>
            <button disabled={savingProfile} className="glass-button mt-4 w-full disabled:opacity-60">{savingProfile ? "Saving…" : "Save profile"}</button>
          </form>
        </section>

        <section className="glass-panel rounded-3xl p-6 sm:p-8">
          <h2 className="text-xl font-bold">Change password</h2>
          <p className="mt-1 text-sm text-gray-400">Enter your current password to protect your account.</p>
          <form onSubmit={changePassword} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-gray-300">Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-gray-300">New password<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} /></label>
            <label className="block text-sm font-medium text-gray-300">Confirm new password<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} /></label>
            <button disabled={savingPassword} className="glass-button mt-2 w-full disabled:opacity-60">{savingPassword ? "Updating…" : "Change password"}</button>
          </form>
          <p className="mt-4 text-xs leading-5 text-gray-500">Forgot-password email recovery requires a configured mail delivery service; this page safely supports changing a password after signing in.</p>
        </section>
      </div>
    </main>
  );
}
