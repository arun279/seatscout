import { createRemoteJWKSet, jwtVerify } from "jose";

const ACCESS_ASSERTION = "cf-access-jwt-assertion";
const FORWARDED = ["accept", "content-type", "user-agent"];

type Env = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  UPSTREAM_ORIGIN?: string;
};

type Configuration = {
  teamDomain: string;
  aud: string;
  upstream: string;
  referer: string;
};

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
        referer: `${new URL(UPSTREAM_ORIGIN).origin}/`,
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
        headers: upstreamHeaders(request.headers, configuration.referer),
        body: request.body,
        redirect: "manual",
      },
    );

    return callerResponse(upstream);
  },
};
