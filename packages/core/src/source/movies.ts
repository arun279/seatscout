import type { Movie } from "../domain/catalogue.js";
import { carries, decoded, isRecord, type Kind } from "./json.js";

interface UpstreamMovie {
  readonly id: number;
  readonly title: string;
}

const MOVIE_FIELDS: Readonly<Record<keyof UpstreamMovie, Kind>> = {
  id: "number",
  title: "string",
};

const isMovie = (value: unknown): value is UpstreamMovie =>
  carries(value, MOVIE_FIELDS);

const carriesMovies = (
  value: unknown,
): value is {
  readonly viewModel: { readonly movies: readonly UpstreamMovie[] };
} =>
  isRecord(value) &&
  isRecord(value.viewModel) &&
  Array.isArray(value.viewModel.movies) &&
  value.viewModel.movies.every(isMovie);

const movieOf = (upstream: UpstreamMovie): Movie => ({
  id: `${upstream.id}`,
  title: upstream.title,
});

export const moviesFrom = (body: string): readonly Movie[] | null => {
  const answer = decoded(body);
  return answer !== null && carriesMovies(answer.value)
    ? answer.value.viewModel.movies.map(movieOf)
    : null;
};
