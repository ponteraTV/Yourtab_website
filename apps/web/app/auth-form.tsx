"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "/api";
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
        };
      };
    };
  }
}

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!googleClientId) return;
    let active = true;
    const setup = () => {
      if (!active || !window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          setBusy(true);
          setError("");
          try {
            const result = await fetch(`${API}/v1/auth/google`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ credential: response.credential }),
            });
            const json = await result.json().catch(() => ({}));
            if (!result.ok) throw new Error(json.message || "Google sign-in failed");
            window.location.assign("/");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
          } finally {
            setBusy(false);
          }
        },
      });
      const target = document.getElementById("google-signin-button");
      if (target) {
        target.replaceChildren();
        window.google.accounts.id.renderButton(target, {
          type: "standard", theme: "outline", size: "large", shape: "pill",
          text: mode === "login" ? "signin_with" : "signup_with",
          width: "320",
        });
        setGoogleReady(true);
      }
    };
    if (window.google) setup();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleIdentity = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", setup);
      return () => { active = false; script?.removeEventListener("load", setup); };
    }
    return () => { active = false; };
  }, [googleClientId, mode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const endpoint = mode === "login" ? "/v1/auth/login" : "/v1/auth/register";
      const body = mode === "login" ? { email, password } : { name: name.trim(), email, password };
      const response = await fetch(`${API}${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.message || (mode === "login" ? "Unable to sign in" : "Unable to create account"));
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden="true" className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-500/20 blur-[100px]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-[-8rem] right-[-8rem] h-96 w-96 rounded-full bg-violet-600/25 blur-[110px]" />
      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950/80 shadow-2xl shadow-cyan-950/20 backdrop-blur-2xl md:grid-cols-2">
        <section className="hidden min-h-[620px] flex-col justify-between bg-gradient-to-br from-cyan-400/15 via-slate-900 to-violet-500/20 p-10 md:flex">
          <Link href="/" className="text-2xl font-black tracking-tight">Your<span className="text-cyan-300">Tab</span></Link>
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">Your world of video</p>
            <h1 className="text-5xl font-black leading-[1.08]">{mode === "login" ? "Welcome back to your next watch." : "Your next favorite video starts here."}</h1>
            <p className="mt-5 max-w-sm leading-7 text-slate-300">{mode === "login" ? "Sign in to continue watching and manage your video library." : "Create your free account to watch, upload, and keep your videos in one place."}</p>
          </div>
          <p className="text-sm text-slate-500">Watch. Upload. Share.</p>
        </section>
        <section className="px-6 py-9 sm:px-10 sm:py-12">
          <Link href="/" className="text-xl font-black md:hidden">Your<span className="text-cyan-300">Tab</span></Link>
          <div className="mt-6 md:mt-3">
            <p className="text-sm font-semibold text-cyan-300">{mode === "login" ? "GOOD TO SEE YOU AGAIN" : "GET STARTED FOR FREE"}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">{mode === "login" ? "Sign in" : "Create your account"}</h2>
            <p className="mt-2 text-sm text-slate-400">{mode === "login" ? "Enter your details to access YourTab." : "A few details and you’re ready to go."}</p>
          </div>
          <div className="mt-7 flex justify-center">
            {googleClientId ? (
              <div id="google-signin-button" className="min-h-10" aria-label="Continue with Google" />
            ) : (
              <button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 opacity-80" title="Google OAuth needs configuration">
                <span className="text-base font-black">G</span> Continue with Google
              </button>
            )}
          </div>
          {!googleClientId && <p className="mt-2 text-center text-xs text-slate-500">Google sign-in will activate after Google OAuth is configured.</p>}
          {googleReady && <span className="sr-only">Google sign-in is ready</span>}
          <div className="my-6 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-white/10" />OR CONTINUE WITH EMAIL<span className="h-px flex-1 bg-white/10" /></div>
          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && <label className="block text-sm font-medium text-slate-300">Full name<input required autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10" /></label>}
            <label className="block text-sm font-medium text-slate-300">Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10" /></label>
            <label className="block text-sm font-medium text-slate-300">Password<input required minLength={8} type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-white outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10" /></label>
            {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            <button disabled={busy} className="w-full rounded-xl bg-gradient-to-r from-cyan-300 to-sky-400 px-4 py-3.5 font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60">{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">{mode === "login" ? "New to YourTab?" : "Already have an account?"}{" "}<Link className="font-semibold text-cyan-300 hover:text-cyan-200" href={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Create an account" : "Sign in"}</Link></p>
          <p className="mt-8 text-center text-xs text-slate-600">By continuing, you agree to use YourTab responsibly.</p>
        </section>
      </div>
    </main>
  );
}
