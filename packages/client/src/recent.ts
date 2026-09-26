import { isRecord, type KeyValueStore, type RecentSearch } from "./store.js";

const KEY = "seatscout.recent.v2";
const ONE_DATE_KEY = "seatscout.recent.v1";
const KEPT = 5;

const areDates = (value: unknown): value is readonly string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((date) => typeof date === "string");

const isSearch = (value: unknown): value is RecentSearch =>
  isRecord(value) &&
  typeof value["movie"] === "string" &&
  areDates(value["dates"]) &&
  typeof value["area"] === "string" &&
  typeof value["partySize"] === "number";

const isHistory = (value: unknown): value is readonly RecentSearch[] =>
  Array.isArray(value) && value.every(isSearch);

const onItsDate = (search: unknown): unknown =>
  isRecord(search)
    ? {
        movie: search["movie"],
        dates: [search["date"]],
        area: search["area"],
        partySize: search["partySize"],
      }
    : null;

const same = (one: RecentSearch, other: RecentSearch) =>
  one.movie === other.movie &&
  one.dates.join() === other.dates.join() &&
  one.area === other.area &&
  one.partySize === other.partySize;

export const openRecentSearches = (
  store: KeyValueStore,
): {
  readonly remembered: () => Promise<readonly RecentSearch[]>;
  readonly remember: (search: RecentSearch) => Promise<RecentSearch[]>;
} => {
  const remembered = async (): Promise<readonly RecentSearch[]> => {
    const held = await store.read(KEY);
    if (held !== undefined) return isHistory(held) ? held : [];
    const earlier = await store.read(ONE_DATE_KEY);
    const migrated = Array.isArray(earlier) ? earlier.map(onItsDate) : earlier;
    return isHistory(migrated) ? migrated : [];
  };
  return {
    remembered,
    remember: async (search: RecentSearch) => {
      const asked: RecentSearch = {
        movie: search.movie,
        dates: search.dates,
        area: search.area,
        partySize: search.partySize,
      };
      const history = [
        asked,
        ...(await remembered()).filter((earlier) => !same(earlier, asked)),
      ].slice(0, KEPT);
      await store.write(KEY, history);
      return history;
    },
  };
};
