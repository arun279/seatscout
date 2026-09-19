const FORWARDED = ["accept", "content-type", "user-agent"];
const ROUTE = "/napi/";

type Env = {
  UPSTREAM_ORIGIN: string;
  VISITOR_RATE: {
    limit: (options: { key: string }) => Promise<{ success: boolean }>;
  };
};

const namesThisSite = (header: string | null, origin: string) =>
  header !== null && (header === origin || header.startsWith(`${origin}/`));

const fromOwnPage = (headers: Headers, origin: string) => {
  const site = headers.get("sec-fetch-site");
  return site === null
    ? namesThisSite(headers.get("origin"), origin) ||
        namesThisSite(headers.get("referer"), origin)
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

    const { success } = await env.VISITOR_RATE.limit({
      key: request.headers.get("cf-connecting-ip") ?? "",
    });
    if (!success) {
      return new Response("Too many requests", { status: 429 });
    }

    const target = new URL(env.UPSTREAM_ORIGIN);
    const answer = await fetch(new URL(pathname + search, target), {
      method: request.method,
      headers: upstreamHeaders(request.headers, `${target.origin}/`),
      body: request.body,
      redirect: "manual",
    });

    return callerResponse(answer);
  },
};
