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
