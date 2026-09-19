import { afterEach, describe, expect, it, vi } from "vitest";
import { deviceSeatScout, listingDate, reaching } from "./source";

const answered = { status: 200, text: () => Promise.resolve("{}") };

const answering = () => {
  const sent: { url: string; headers: Readonly<Record<string, string>> }[] = [];
  const reach = reaching((url, init) => {
    sent.push({ url, headers: init?.headers ?? {} });
    return Promise.resolve(answered);
  });
  return { sent, reach };
};

describe("reading the Source from a phone", () => {
  it("asks the Source's own origin for a route the adapter names relatively", async () => {
    const { sent, reach } = answering();
    await reach("/napi/nearbyTheaters?zipCode=75010&limit=25");
    expect(sent[0]?.url).toBe(
      "https://www.fandango.com/napi/nearbyTheaters?zipCode=75010&limit=25",
    );
  });

  it("names the Source's own page as the referer, as the proxy does for a browser", async () => {
    const { sent, reach } = answering();
    await reach("/napi/seatMap/558117351");
    expect(sent[0]?.headers["Referer"]).toBe("https://www.fandango.com/");
  });

  it("names a browser as the user agent, as the capture and the proxy both do", async () => {
    const { sent, reach } = answering();
    await reach("/napi/seatMap/558117351");
    expect(sent[0]?.headers["User-Agent"]).toMatch(/^Mozilla\/5\.0 /);
  });

  it("lets a read carry a header of its own without losing the ones every read carries", async () => {
    const { sent, reach } = answering();
    await reach("/napi/seatMap/1", { headers: { Accept: "application/json" } });
    expect(sent[0]?.headers).toMatchObject({
      Accept: "application/json",
      Referer: "https://www.fandango.com/",
    });
  });

  it("carries the cache mode the read asked for, because Availability is never held over", async () => {
    const asked: (string | undefined)[] = [];
    const reach = reaching((_url, init) => {
      asked.push(init?.cache);
      return Promise.resolve(answered);
    });
    await reach("/napi/seatMap/558117351", { cache: "no-store" });
    expect(asked).toEqual(["no-store"]);
  });

  it("answers with what the Source answered", async () => {
    const reach = reaching(() =>
      Promise.resolve({ status: 404, text: () => Promise.resolve("gone") }),
    );
    const response = await reach("/napi/seatMap/1");
    expect([response.status, await response.text()]).toEqual([404, "gone"]);
  });
});

describe("what the device gives the application", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("reads the Source through the device's own fetch, clock and timers", async () => {
    const STARTED_AT = 1_789_000_000_000;
    vi.useFakeTimers();
    vi.setSystemTime(STARTED_AT);
    const asked: string[] = [];
    vi.stubGlobal("fetch", (url: string) => {
      asked.push(url);
      return Promise.resolve({ status: 503, text: () => Promise.resolve("") });
    });
    const read = deviceSeatScout().programme("75010", "2026-09-19");
    let settled = false;
    void read.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    const reading = await read;
    expect(asked).toEqual([
      "https://www.fandango.com/napi/nearbyTheaters?zipCode=75010&limit=25",
      "https://www.fandango.com/napi/nearbyTheaters?zipCode=75010&limit=25",
      "https://www.fandango.com/napi/nearbyTheaters?zipCode=75010&limit=25",
    ]);
    expect(reading).toMatchObject({ ok: false, reason: "unreachable" });
    expect(reading.fetchedAt).toBeGreaterThanOrEqual(STARTED_AT);
    expect(reading.fetchedAt).toBeLessThanOrEqual(STARTED_AT + 60_000);
  });
});

describe("the date a listing is asked for", () => {
  it("pads a single-digit month and day, and stays on the day the phone is on late at night", () => {
    expect(listingDate(new Date(2026, 0, 9, 23, 30))).toBe("2026-01-09");
  });

  it("stays on the day the phone is on just after midnight", () => {
    expect(listingDate(new Date(2026, 8, 19, 0, 30))).toBe("2026-09-19");
  });
});
