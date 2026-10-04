import { jest } from "@jest/globals";
import type {
  SearchTerms,
  SeatGroupResult,
  SeatScout,
  TicketingUrl,
  Verified,
} from "@seatscout/client";
import { seatMapBodyWithStatuses } from "@seatscout/client/testing";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { HandOff } from "../src/hand-off/hand-off.js";
import type { Clock } from "../src/host/clock.js";
import { phone } from "./phone.js";
import { NOW } from "./rooms.js";

export const HOOKY_ADDISON = "Hooky Entertainment Addison + SDX";

export const HOOKY_TICKETING =
  "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2026-09-20%2B09%3A00&from=mov_det_showtimes&source=desktop&mid=245893&tid=aawza&dfam=webbrowser&showtimehashcode=v2-4be31253fe8dbfc0de135d40176bce4135e2eae47ea913ffc171124b31b9e3da";

export const OFFLINE_HERE =
  "Offline. Seats are never cached, so this hand-off can be checked when the connection returns.";

const WHOLE_LISTING: SearchTerms = {
  movie: "245893",
  dates: ["2026-09-20"],
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

export const TODAY = "2026-09-20";

const HOOKY_ADDISON_9AM = 564424799;

const SEAT_MAP = "/napi/seatMap/";

export interface Room {
  readonly status?: number;
  readonly statuses?: Readonly<Record<string, string>>;
  readonly others?: string;
}

export interface Counter {
  readonly seatscout: SeatScout;
  readonly chosen: SeatGroupResult;
  readonly clock: Clock & { readonly advance: (ms: number) => void };
  readonly roomAtHandOff: (room: Room) => void;
  readonly holdSeatMaps: () => void;
  readonly releaseSeatMaps: () => void;
}

const ticking = () => {
  let now = NOW;
  const watchers = new Set<() => void>();
  return {
    now: () => now,
    subscribe: (watcher: () => void) => {
      watchers.add(watcher);
      return () => watchers.delete(watcher);
    },
    advance: (ms: number) => {
      now += ms;
      for (const watcher of watchers) watcher();
    },
  };
};

export const atTheCounter = async (): Promise<Counter> => {
  const held: (() => void)[] = [];
  let holding = false;
  let room: Room | null = null;
  const { seatscout } = phone([], {
    script: {},
    through: (upstream) => async (url, init) => {
      const answer = await upstream(url, init);
      if (!url.startsWith(SEAT_MAP)) return answer;
      if (holding) await new Promise<void>((resume) => held.push(resume));
      if (room === null) return answer;
      const { status, statuses, others } = room;
      const text = seatMapBodyWithStatuses(
        await answer.text(),
        (seat) => statuses?.[seat.id] ?? others,
      );
      return {
        status: status ?? answer.status,
        text: () => Promise.resolve(text),
      };
    },
  });
  const { results } = await seatscout.search(WHOLE_LISTING).done;
  const chosen = results.find(
    (result) => result.showtime.id === HOOKY_ADDISON_9AM,
  );
  if (chosen === undefined) throw new Error("Hooky Addison was not ranked");
  return {
    seatscout,
    chosen,
    clock: ticking(),
    roomAtHandOff: (answer) => {
      room = answer;
    },
    holdSeatMaps: () => {
      holding = true;
    },
    releaseSeatMaps: () => {
      holding = false;
      for (const resume of held.splice(0)) resume();
    },
  };
};

export interface Opened extends Counter {
  readonly checkout: jest.Mock<(ticketing: TicketingUrl) => Promise<void>>;
  readonly onClose: jest.Mock<() => void>;
  readonly answered: () => Promise<Verified>;
  readonly closeTheBrowser: () => Promise<void>;
  readonly online: (online: boolean) => Promise<void>;
}

export const opened = async (online = true): Promise<Opened> => {
  const counter = await atTheCounter();
  let browserClosed: () => void = () => undefined;
  const checkout = jest.fn(
    (_ticketing: TicketingUrl) =>
      new Promise<void>((closed) => {
        browserClosed = closed;
      }),
  );
  const onClose = jest.fn<() => void>();
  const verifications: Promise<Verified>[] = [];
  const verify: SeatScout["verify"] = (chosen) => {
    const verified = counter.seatscout.verify(chosen);
    verifications.push(verified);
    return verified;
  };
  const sheet = (connected: boolean) => (
    <HandOff
      checkout={checkout}
      chosen={counter.chosen}
      clock={counter.clock}
      onClose={onClose}
      online={connected}
      today={TODAY}
      verify={verify}
    />
  );
  const view = await render(sheet(online));
  return {
    ...counter,
    checkout,
    onClose,
    answered: async () => {
      const verified = await act(async () => {
        const last = verifications.at(-1);
        if (last === undefined) throw new Error("nothing was verified");
        return last;
      });
      await act(() => Promise.resolve());
      return verified;
    },
    closeTheBrowser: () =>
      act(async () => {
        browserClosed();
        await Promise.resolve();
      }),
    online: (connected) => view.rerender(sheet(connected)),
  };
};

export const take = (seats: string): Promise<void> =>
  fireEvent.press(screen.getByRole("button", { name: `Take ${seats}` }));

export const taken = async (room: Room): Promise<Opened> => {
  const counter = await opened();
  counter.roomAtHandOff(room);
  await take("E12 and E11");
  await counter.answered();
  return counter;
};
