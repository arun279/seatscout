import type { Terms } from "./terms.js";

export type Step = "area" | "movie";

export const nextOf = ({
  area,
  movie,
}: Pick<Terms, "area" | "movie">): Step | undefined => {
  if (area === undefined) return "area";
  return movie === undefined ? "movie" : undefined;
};
