import type { Search, Snapshot } from "./search.js";

export const readToTheEnd = async (
  search: Search,
  last?: Snapshot,
): Promise<Snapshot> => {
  const read = await search.readMore();
  return read === last ? read : readToTheEnd(search, read);
};
