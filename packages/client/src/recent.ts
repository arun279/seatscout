import { isRecord, type KeyValueStore, type RecentSearch } from "./store.js";

const KEY = "seatscout.recent.v1";
const KEPT = 5;

const isSearch = (value: unknown): value is RecentSearch =>
  isRecord(value) &&
  typeof value.movie === "string" &&
  typeof value.date === "string" &&
  typeof value.area === "string" &&
  typeof value.partySize === "number";

const isHistory = (value: unknown): value is readonly RecentSearch[] =>
  Array.isArray(value) && value.every(isSearch);

const same = (one: RecentSearch, other: RecentSearch) =>
  one.movie === other.movie &&
  one.date === other.date &&
  one.area === other.area &&
  one.partySize === other.partySize;

export const openRecentSearches = (store: KeyValueStore) => {
  const remembered = async (): Promise<readonly RecentSearch[]> => {
    const held = await store.read(KEY);
    return isHistory(held) ? held : [];
  };
  return {
    remembered,
    remember: async (search: RecentSearch) => {
      const asked: RecentSearch = {
        movie: search.movie,
        date: search.date,
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
