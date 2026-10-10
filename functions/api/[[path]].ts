interface Env {
  API_ORIGIN: string;
}

export const onRequest = async (context: {
  request: Request;
  env: Env;
}): Promise<Response> => {
  const { request, env } = context;

  if (!env.API_ORIGIN) {
    return new Response("API_ORIGIN is not configured", { status: 500 });
  }

  const incoming = new URL(request.url);
  const origin = env.API_ORIGIN.replace(/\/$/, "");
  const target = `${origin}${incoming.pathname}${incoming.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });

    const responseHeaders = new Headers(upstream.headers);

    // Preserve each Set-Cookie header explicitly. Authentication relies on the
    // API's HttpOnly session cookie surviving the Pages proxy response.
    const setCookies = typeof upstream.headers.getSetCookie === "function"
      ? upstream.headers.getSetCookie()
      : [];
    if (setCookies.length > 0) {
      responseHeaders.delete("Set-Cookie");
      for (const cookie of setCookies) {
        responseHeaders.append("Set-Cookie", cookie);
      }
    }

    // Authentication responses must not be cached by an intermediary.
    if (incoming.pathname.startsWith("/api/v1/auth/")) {
      responseHeaders.set("Cache-Control", "no-store");
    }

    responseHeaders.set("X-Content-Type-Options", "nosniff");
    responseHeaders.set("Referrer-Policy", "origin-when-cross-origin");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response("Upstream API unavailable", { status: 502 });
  }
};
