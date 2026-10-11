interface Env {
  API_ORIGIN: string;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      if (!env.API_ORIGIN) return new Response("API_ORIGIN is not configured", { status: 500 });
      const origin = env.API_ORIGIN.replace(/\/$/, "");
      const target = new URL(origin + url.pathname + url.search);
      const headers = new Headers(request.headers);
      headers.delete("host");
      try {
        const upstream = await fetch(target, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body, redirect: "manual" });
        const responseHeaders = new Headers(upstream.headers);
        // Keep HttpOnly session cookies intact when auth responses pass through the Worker.
        const setCookies = typeof upstream.headers.getSetCookie === "function"
          ? upstream.headers.getSetCookie()
          : [];
        if (setCookies.length > 0) {
          responseHeaders.delete("Set-Cookie");
          for (const cookie of setCookies) responseHeaders.append("Set-Cookie", cookie);
        }
        if (url.pathname.startsWith("/api/v1/auth/")) {
          responseHeaders.set("Cache-Control", "no-store");
        }
        responseHeaders.set("X-Content-Type-Options", "nosniff");
        responseHeaders.set("Referrer-Policy", "origin-when-cross-origin");
        return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders });
      } catch {
        return new Response("Upstream API unavailable", { status: 502 });
      }
    }
    return env.ASSETS.fetch(request);
  },
};
