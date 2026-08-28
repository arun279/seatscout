import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "./index.js";

const ALGORITHM = "RS256";
const AUDIENCE = "6bd6b1cd0f1b0b4b2c0a2b5c8f3d9e7a";
const UPSTREAM = "https://aggregator.test";
const CERTS = "/cdn-cgi/access/certs";

const current = await generateKeyPair(ALGORITHM, { extractable: true });
const rotated = await generateKeyPair(ALGORITHM, { extractable: true });
const published = {
  keys: [
    { ...(await exportJWK(rotated.publicKey)), alg: ALGORITHM, kid: "rotated" },
    { ...(await exportJWK(current.publicKey)), alg: ALGORITHM, kid: "current" },
  ],
};

const BYTES_NO_PARSER_SURVIVES = Uint8Array.from([
  ...new TextEncoder().encode('{"seats":['),
  ...Array.from({ length: 256 }, (_, byte) => byte),
]);

let teams = 0;

const coldTeamDomain = () => {
  teams += 1;
  return `https://team${teams}.cloudflareaccess.test`;
};

const network = (
  answer: (request: Request) => Response = () => new Response("{}"),
) => {
  const teamDomain = coldTeamDomain();
  const received: Request[] = [];
  let keyFetches = 0;

  vi.stubGlobal("fetch", async (resource: URL | string, init?: RequestInit) => {
    const url = String(resource);
    if (url === `${teamDomain}${CERTS}`) {
      keyFetches += 1;
      return Response.json(published);
    }
    if (!url.startsWith(UPSTREAM)) {
      return new Response("unknown route", { status: 404 });
    }
    const streamed = init?.body instanceof ReadableStream ? init.body : null;
    const request = new Request(url, {
      ...init,
      body: streamed === null ? null : await new Response(streamed).text(),
    });
    received.push(request);
    const response = answer(request);
    return response.status === 302 && init?.redirect !== "manual"
      ? new Response("{}", { status: 200 })
      : response;
  });

  return {
    env: {
      ACCESS_TEAM_DOMAIN: teamDomain,
      ACCESS_AUD: AUDIENCE,
      UPSTREAM_ORIGIN: UPSTREAM,
    },
    received,
    keyFetches: () => keyFetches,
    assertion: (
      claim: { kid?: string; issuer?: string; audience?: string } = {},
    ) =>
      new SignJWT({ email: "moviegoer@example.com" })
        .setProtectedHeader({ alg: ALGORITHM, kid: claim.kid ?? "current" })
        .setIssuer(claim.issuer ?? teamDomain)
        .setAudience(claim.audience ?? AUDIENCE)
        .setExpirationTime("1h")
        .sign(current.privateKey),
  };
};

const through = (
  { env }: { env: Partial<ReturnType<typeof network>["env"]> },
  headers: Record<string, string> = {},
  sent?: { method: string; body: string },
) =>
  proxy.fetch(
    new Request("https://proxy.test/showtimes?zip=10001", {
      headers,
      ...sent,
    }),
    env,
  );

const headerNamesOf = (request: Request | undefined) => [
  ...(request?.headers.keys() ?? []),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("access", () => {
  it("rejects a request carrying no access assertion", async () => {
    const upstream = network();
    const response = await through(upstream);

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("No access assertion");
    expect(upstream.received).toEqual([]);
  });

  it.each([
    ["naming a key the team domain does not publish", { kid: "unpublished" }],
    ["whose signature does not match the key it names", { kid: "rotated" }],
    ["issued for another application", { audience: "another-application" }],
    [
      "issued by another team domain",
      { issuer: "https://elsewhere.cloudflareaccess.test" },
    ],
  ])("rejects an assertion %s", async (_, claim) => {
    const upstream = network();
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(claim),
    });

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("The access assertion did not verify");
    expect(upstream.received).toEqual([]);
  });

  it("passes an identity the access layer admitted, reading the keys once", async () => {
    const upstream = network();
    const headers = { "cf-access-jwt-assertion": await upstream.assertion() };

    expect((await through(upstream, headers)).status).toBe(200);
    expect((await through(upstream, headers)).status).toBe(200);
    expect(upstream.received).toHaveLength(2);
    expect(upstream.keyFetches()).toBe(1);
  });

  it.each(["ACCESS_TEAM_DOMAIN", "ACCESS_AUD", "UPSTREAM_ORIGIN"])(
    "refuses to serve anything without %s",
    async (missing) => {
      const upstream = network();
      const response = await through(
        { env: { ...upstream.env, [missing]: undefined } },
        { "cf-access-jwt-assertion": await upstream.assertion() },
      );

      expect(response.status).toBe(500);
      expect(await response.text()).toBe("The proxy is not configured");
      expect(upstream.received).toEqual([]);
    },
  );
});

describe("the session", () => {
  it("sends upstream only the headers the caller nominated", async () => {
    const upstream = network();
    await through(upstream, {
      accept: "application/json",
      "cf-access-jwt-assertion": await upstream.assertion(),
      "cf-connecting-ip": "203.0.113.7",
      "content-type": "application/json",
      cookie: "CF_Authorization=this-hop-only",
      origin: "https://proxy.test",
      "user-agent": "seatscout/0.0.0",
      "x-upstream-cookie": "session=held",
    });

    expect(headerNamesOf(upstream.received[0])).toEqual([
      "accept",
      "content-type",
      "cookie",
      "user-agent",
    ]);
    expect(upstream.received[0]?.headers.get("cookie")).toBe("session=held");
  });

  it("sends nothing upstream and returns nothing when neither side holds one", async () => {
    const upstream = network();
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
    });

    expect(headerNamesOf(upstream.received[0])).toEqual([]);
    expect(response.headers.has("x-upstream-set-cookie")).toBe(false);
  });

  it("returns the session an upstream bootstrap opens", async () => {
    const upstream = network(
      () => new Response("{}", { headers: { "set-cookie": "session=new" } }),
    );
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
    });

    expect(response.headers.get("x-upstream-set-cookie")).toBe("session=new");
  });

  it("merges what the upstream sets into the session the caller holds", async () => {
    const upstream = network(
      () =>
        new Response("{}", {
          headers: [
            ["set-cookie", "session=fresh; Path=/; HttpOnly"],
            ["set-cookie", "region=nyc; Path=/"],
          ],
        }),
    );
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
      "x-upstream-cookie": "session=stale; sid=42",
    });

    expect(upstream.received[0]?.headers.get("cookie")).toBe(
      "session=stale; sid=42",
    );
    expect(response.headers.get("x-upstream-set-cookie")).toBe(
      "session=fresh; sid=42; region=nyc",
    );
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it("drops a cookie the upstream cleared rather than replaying it", async () => {
    const upstream = network(
      () => new Response("{}", { headers: { "set-cookie": "session=" } }),
    );
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
      "x-upstream-cookie": "session=stale; sid=42",
    });

    expect(response.headers.get("x-upstream-set-cookie")).toBe("sid=42");
  });
});

describe("the response", () => {
  it("passes the upstream bytes through unread, one request per call", async () => {
    const upstream = network(
      () =>
        new Response(BYTES_NO_PARSER_SURVIVES, {
          headers: { "content-type": "application/octet-stream" },
          status: 206,
          statusText: "Partial Content",
        }),
    );
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
    });

    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      BYTES_NO_PARSER_SURVIVES,
    );
    expect(response.status).toBe(206);
    expect(response.statusText).toBe("Partial Content");
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(upstream.received).toHaveLength(1);
    expect(upstream.received[0]?.url).toBe(`${UPSTREAM}/showtimes?zip=10001`);
  });

  it("carries the caller's method and request body upstream", async () => {
    const upstream = network();
    await through(
      upstream,
      {
        "cf-access-jwt-assertion": await upstream.assertion(),
        "content-type": "application/json",
      },
      { method: "POST", body: '{"showtime":"abc"}' },
    );

    expect(upstream.received[0]?.method).toBe("POST");
    expect(await upstream.received[0]?.text()).toBe('{"showtime":"abc"}');
  });

  it("hands an upstream redirect back rather than following it", async () => {
    const upstream = network(
      () =>
        new Response(null, {
          headers: { location: `${UPSTREAM}/session` },
          status: 302,
        }),
    );
    const response = await through(upstream, {
      "cf-access-jwt-assertion": await upstream.assertion(),
    });

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${UPSTREAM}/session`);
    expect(upstream.received).toHaveLength(1);
  });
});
