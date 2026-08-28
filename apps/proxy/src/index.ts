import { createRemoteJWKSet, jwtVerify } from "jose";

const ACCESS_ASSERTION = "cf-access-jwt-assertion";
const UPSTREAM_COOKIE = "x-upstream-cookie";
const UPSTREAM_SET_COOKIE = "x-upstream-set-cookie";
const FORWARDED = ["accept", "content-type", "user-agent"];

type Env = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  UPSTREAM_ORIGIN?: string;
};

type Configuration = { teamDomain: string; aud: string; upstream: string };

const configurationOf = ({
  ACCESS_TEAM_DOMAIN,
  ACCESS_AUD,
  UPSTREAM_ORIGIN,
}: Env): Configuration | null =>
  ACCESS_TEAM_DOMAIN && ACCESS_AUD && UPSTREAM_ORIGIN
    ? {
        teamDomain: ACCESS_TEAM_DOMAIN,
        aud: ACCESS_AUD,
        upstream: UPSTREAM_ORIGIN,
      }
    : null;

const keySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

const keysFor = (teamDomain: string) => {
  const known = keySets.get(teamDomain);
  if (known) return known;
  const keys = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", teamDomain));
  keySets.set(teamDomain, keys);
  return keys;
};

const refusal = async (
  assertion: string | null,
  { teamDomain, aud }: Configuration,
) => {
  if (assertion === null) {
    return new Response("No access assertion", { status: 403 });
  }
  try {
    await jwtVerify(assertion, keysFor(teamDomain), {
      issuer: teamDomain,
      audience: aud,
    });
    return null;
  } catch {
    return new Response("The access assertion did not verify", { status: 403 });
  }
};

const upstreamHeaders = (from: Headers) => {
  const headers = new Headers();
  for (const name of FORWARDED) {
    const value = from.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookie = from.get(UPSTREAM_COOKIE);
  if (cookie !== null) headers.set("cookie", cookie);
  return headers;
};

const sessionAfter = (cookie: string | null, setCookies: readonly string[]) => {
  const opened = setCookies.map(
    (setCookie) => setCookie.split(";")[0] ?? setCookie,
  );
  const jar = new Map<string, string>();
  for (const pair of [...(cookie ?? "").split(";"), ...opened]) {
    const trimmed = pair.trim();
    const [name = trimmed] = trimmed.split("=");
    if (trimmed === "" || trimmed.endsWith("=")) jar.delete(name);
    else jar.set(name, trimmed);
  }
  return [...jar.values()].join("; ");
};

const callerResponse = (upstream: Response, session: string) => {
  const headers = new Headers(upstream.headers);
  headers.delete("set-cookie");
  if (session !== "") headers.set(UPSTREAM_SET_COOKIE, session);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const configuration = configurationOf(env);
    if (configuration === null) {
      return new Response("The proxy is not configured", { status: 500 });
    }

    const refused = await refusal(
      request.headers.get(ACCESS_ASSERTION),
      configuration,
    );
    if (refused !== null) return refused;

    const { pathname, search } = new URL(request.url);
    const upstream = await fetch(
      new URL(pathname + search, configuration.upstream),
      {
        method: request.method,
        headers: upstreamHeaders(request.headers),
        body: request.body,
        redirect: "manual",
      },
    );

    const session = sessionAfter(
      request.headers.get(UPSTREAM_COOKIE),
      upstream.headers.getSetCookie(),
    );
    return callerResponse(upstream, session);
  },
};
