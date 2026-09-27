import { beforeAll, describe, expect, it, jest } from "@jest/globals";
import type { TicketingUrl } from "@seatscout/client";
import { atTheCounter, HOOKY_TICKETING } from "../../test/hand-off.js";
import { WARM_UP } from "../../test/rooms.js";
import { inAppBrowser } from "./checkout.js";

const mockOpen = jest.fn<(url: string) => Promise<{ type: string }>>();

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: (url: string) => mockOpen(url),
}));

let ticketing: TicketingUrl;

beforeAll(async () => {
  const { seatscout, chosen } = await atTheCounter();
  const verified = await seatscout.verify(chosen);
  if (!verified.ok) throw new Error("the corpus's Seat Group was not there");
  ticketing = verified.ticketing;
}, WARM_UP);

describe("the checkout on a phone", () => {
  it("opens the ticketing URL in the in-app browser exactly as it was carried", async () => {
    mockOpen.mockResolvedValue({ type: "cancel" });

    await inAppBrowser(ticketing);

    expect(mockOpen.mock.calls).toEqual([[HOOKY_TICKETING]]);
  });

  it("settles only once the browser has been closed", async () => {
    let close = (): void => undefined;
    mockOpen.mockReturnValue(
      new Promise((closed) => {
        close = () => closed({ type: "cancel" });
      }),
    );
    let settledYet = false;

    const opened = inAppBrowser(ticketing).then(() => {
      settledYet = true;
    });
    await Promise.resolve();

    expect(settledYet).toBe(false);

    close();
    await opened;

    expect(settledYet).toBe(true);
  });
});
