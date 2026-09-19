import { afterEach, describe, expect, it, vi } from "vitest";
import proxy from "./index.js";

const UPSTREAM = "https://aggregator.test";
const SITE = "https://proxy.test";
const READ = "/napi/nearbyTheaters?zipCode=10001";
const OWN_PAGE = { "sec-fetch-site": "same-origin" };

const BYTES_NO_PARSER_SURVIVES = Uint8Array.from([
  ...new TextEncoder().encode('{"seats":['),
  ...Array.from({ length: 256 }, (_, byte) => byte),
]);

const network = (
  answer: (request: Request) => Response = () => new Response("{}"),
) => {
  const received: Request[] = [];
  const keyed: string[] = [];
  let admitting = true;

  vi.stubGlobal("fetch", async (resource: URL | string, init?: RequestInit) => {
    const url = String(resource);
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
      UPSTREAM_ORIGIN: UPSTREAM,
      VISITOR_RATE: {
        limit: async (options: { key: string }) => {
          keyed.push(options.key);
          return { success: admitting };
        },
      },
    },
    received,
    keyed,
    exhaust: () => {
      admitting = false;
    },
  };
};

type Stub = { env: ReturnType<typeof network>["env"] };

const at = ({ env }: Stub, path: string) =>
  proxy.fetch(new Request(`${SITE}${path}`, { headers: OWN_PAGE }), env);

const through = (
  { env }: Stub,
  headers: Record<string, string> = OWN_PAGE,
  sent?: { method: string; body: string },
) => proxy.fetch(new Request(`${SITE}${READ}`, { headers, ...sent }), env);

const headerNamesOf = (request: Request | undefined) => [
  ...(request?.headers.keys() ?? []),
];

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what the proxy answers at all", () => {
  it("carries a read the app's own page issued", async () => {
    const upstream = network();

    expect((await through(upstream)).status).toBe(200);
    expect(upstream.received).toHaveLength(1);
  });

  it.each(["/", "/index.html", "/napi", "/napi-archive/seatMap/1"])(
    "proxies nothing at %s, so the deployment relays one upstream's reads and no more",
    async (path) => {
      const upstream = network();
      const response = await at(upstream, path);

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Nothing is proxied at that path");
      expect(upstream.received).toEqual([]);
    },
  );
});

describe("requests from this site's own pages", () => {
  it.each(["cross-site", "same-site", "none"])(
    "refuses a request whose fetch metadata says %s",
    async (site) => {
      const upstream = network();
      const response = await through(upstream, { "sec-fetch-site": site });

      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Not a request from this site");
      expect(upstream.received).toEqual([]);
    },
  );

  it.each([
    ["an origin of this site", { origin: SITE }],
    ["a referer on this site", { referer: `${SITE}/?movie=245569` }],
  ])(
    "carries a read from a browser that sends no fetch metadata but %s",
    async (_, headers) => {
      const upstream = network();

      expect((await through(upstream, headers)).status).toBe(200);
      expect(upstream.received).toHaveLength(1);
    },
  );

  it.each([
    ["nothing to say where it came from", {}],
    ["an origin somewhere else", { origin: "https://elsewhere.test" }],
    ["a referer somewhere else", { referer: "https://elsewhere.test/" }],
    [
      "an origin whose host only begins as this one",
      {
        origin: `${SITE}.elsewhere.test`,
      },
    ],
    [
      "a referer whose host only begins as this one",
      {
        referer: `${SITE}.elsewhere.test/`,
      },
    ],
  ])(
    "refuses a request that sends no fetch metadata and %s",
    async (_, headers) => {
      const upstream = network();
      const response = await through(upstream, headers);

      expect(response.status).toBe(403);
      expect(await response.text()).toBe("Not a request from this site");
      expect(upstream.received).toEqual([]);
    },
  );
});

describe("one visitor's share", () => {
  it("refuses a visitor the rate limiter has stopped admitting", async () => {
    const upstream = network();
    upstream.exhaust();
    const response = await through(upstream);

    expect(response.status).toBe(429);
    expect(await response.text()).toBe("Too many requests");
    expect(upstream.received).toEqual([]);
  });

  it("counts a read against the address it came from", async () => {
    const upstream = network();
    await through(upstream, { ...OWN_PAGE, "cf-connecting-ip": "203.0.113.7" });

    expect(upstream.keyed).toEqual(["203.0.113.7"]);
  });

  it("counts a read the platform named no address for against one key", async () => {
    const upstream = network();
    await through(upstream);

    expect(upstream.keyed).toEqual([""]);
  });

  it("spends nothing on a request it has already refused", async () => {
    const upstream = network();
    await through(upstream, { "sec-fetch-site": "cross-site" });

    expect(upstream.keyed).toEqual([]);
  });
});

describe("the hop to the upstream", () => {
  it("sends upstream only the headers the caller nominated", async () => {
    const upstream = network();
    await through(upstream, {
      ...OWN_PAGE,
      accept: "application/json",
      "cf-connecting-ip": "203.0.113.7",
      "content-type": "application/json",
      cookie: "session=this-hop-only",
      origin: SITE,
      referer: `${SITE}/results`,
      "user-agent": "seatscout/0.0.0",
    });

    expect(headerNamesOf(upstream.received[0])).toEqual([
      "accept",
      "content-type",
      "referer",
      "user-agent",
    ]);
    expect(upstream.received[0]?.headers.get("referer")).toBe(`${UPSTREAM}/`);
  });

  it("names the upstream as its own referer, which is what the upstream admits", async () => {
    const upstream = network();
    await through(upstream);

    expect(headerNamesOf(upstream.received[0])).toEqual(["referer"]);
    expect(upstream.received[0]?.headers.get("referer")).toBe(`${UPSTREAM}/`);
  });

  it("plants none of the upstream's cookies on the caller", async () => {
    const upstream = network(
      () =>
        new Response("{}", {
          headers: [
            ["set-cookie", "session=fresh; Path=/; HttpOnly"],
            ["set-cookie", "region=nyc; Path=/"],
          ],
        }),
    );
    const response = await through(upstream);

    expect(response.headers.getSetCookie()).toEqual([]);
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
    const response = await through(upstream);

    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      BYTES_NO_PARSER_SURVIVES,
    );
    expect(response.status).toBe(206);
    expect(response.statusText).toBe("Partial Content");
    expect(response.headers.get("content-type")).toBe(
      "application/octet-stream",
    );
    expect(upstream.received).toHaveLength(1);
    expect(upstream.received[0]?.url).toBe(`${UPSTREAM}${READ}`);
  });

  it("carries the caller's method and request body upstream", async () => {
    const upstream = network();
    await through(
      upstream,
      { ...OWN_PAGE, "content-type": "application/json" },
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
    const response = await through(upstream);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(`${UPSTREAM}/session`);
    expect(upstream.received).toHaveLength(1);
  });
});
