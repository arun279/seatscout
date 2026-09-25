import { twoDigits } from "@seatscout/view-logic";

export interface Clock {
  readonly now: () => number;
  readonly subscribe: (tick: () => void) => () => void;
}

const SECOND = 1000;

export const listingDate = (at: Date): string =>
  `${at.getFullYear()}-${twoDigits(at.getMonth() + 1)}-${twoDigits(at.getDate())}`;

export const dateAt = (listing: string): Date =>
  new Date(
    Number(listing.slice(0, 4)),
    Number(listing.slice(5, 7)) - 1,
    Number(listing.slice(8, 10)),
  );

export const clockFor = (at: Date): string =>
  `${twoDigits(at.getHours())}:${twoDigits(at.getMinutes())}`;

export const timeAt = (clock: string): Date =>
  new Date(2000, 0, 1, Number(clock.slice(0, 2)), Number(clock.slice(3, 5)));

export const today = (): string => listingDate(new Date());

export const deviceClock = (): Clock => {
  const watching = new Set<() => void>();
  let at = Date.now();
  let ticking: ReturnType<typeof setInterval> | undefined;

  return {
    now: () => at,
    subscribe: (tick) => {
      watching.add(tick);
      ticking ??= setInterval(() => {
        at = Date.now();
        for (const watcher of watching) watcher();
      }, SECOND);
      return () => {
        watching.delete(tick);
        if (watching.size > 0) return;
        clearInterval(ticking);
        ticking = undefined;
      };
    },
  };
};
