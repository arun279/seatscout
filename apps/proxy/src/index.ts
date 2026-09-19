const FORWARDED = ["accept", "content-type", "user-agent"];
const ROUTE = "/napi/";

type Env = {
  UPSTREAM_ORIGIN: string;
  VISITOR_RATE: {
    limit: (of: { key: string }) => Promise<{ success: boolean }>;
  };
};

const claims = (header: string | null, origin: string) =>
  header !== null && (header === origin || header.startsWith(`${origin}/`));

const fromOwnPage = (headers: Headers, origin: string) => {
  const site = headers.get("sec-fetch-site");
  return site === null
    ? claims(headers.get("origin"), origin) ||
        claims(headers.get("referer"), origin)
    : site === "same-origin";
};

const upstreamHeaders = (from: Headers, referer: string) => {
  const headers = new Headers({ referer });
  for (const name of FORWARDED) {
    const value = from.get(name);
    if (value !== null) headers.set(name, value);
  }
  return headers;
};

const callerResponse = (upstream: Response) => {
  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname, search, origin } = new URL(request.url);
    if (!pathname.startsWith(ROUTE)) {
      return new Response("Nothing is proxied at that path", { status: 404 });
    }
    if (!fromOwnPage(request.headers, origin)) {
      return new Response("Not a request from this site", { status: 403 });
    }

    const visitor = request.headers.get("cf-connecting-ip") ?? "";
    const { success } = await env.VISITOR_RATE.limit({ key: visitor });
    if (!success) {
      return new Response("Too many requests", { status: 429 });
    }

    const upstream = new URL(env.UPSTREAM_ORIGIN);
    const answer = await fetch(new URL(pathname + search, upstream), {
      method: request.method,
      headers: upstreamHeaders(request.headers, `${upstream.origin}/`),
      body: request.body,
      redirect: "manual",
    });

    return callerResponse(answer);
  },
};
