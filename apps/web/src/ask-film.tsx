import type { Movie } from "@seatscout/client";
import { type ProgrammeState, suggestedFor } from "./programme.js";

interface FilmProps {
  readonly area: string | undefined;
  readonly programme: ProgrammeState;
  readonly typed: string;
  readonly onTyped: (typed: string) => void;
}

const statusOf = (
  area: string | undefined,
  programme: ProgrammeState,
): string | null => {
  if (programme.phase === "none") return "Name an area to see what is playing.";
  if (programme.phase === "reading")
    return `Reading what is playing near ${area}`;
  if (programme.phase === "unreachable")
    return `What is playing near ${area} could not be read.`;
  const unreached = programme.unreached;
  if (unreached.length === 0) return null;
  const names = unreached.map((theater) => theater.name).join(", ");
  return `Films at ${unreached.length} theater${unreached.length === 1 ? "" : "s"} could not be read: ${names}.`;
};

const Highlighted = ({
  movie,
  typed,
}: {
  readonly movie: Movie;
  readonly typed: string;
}) => {
  const at = movie.title.toLowerCase().indexOf(typed.trim().toLowerCase());
  const to = at + typed.trim().length;
  return (
    <>
      {movie.title.slice(0, at)}
      <em>{movie.title.slice(at, to)}</em>
      {movie.title.slice(to)}
    </>
  );
};

export const Film = ({ area, programme, typed, onTyped }: FilmProps) => {
  const status = statusOf(area, programme);
  const suggested = suggestedFor(typed, programme.movies);
  return (
    <div className="field">
      <label className="field">
        <span className="eyebrow">Film</span>
        <input
          className="input"
          data-term="movie"
          value={typed}
          onChange={(event) => onTyped(event.target.value)}
        />
      </label>
      {status !== null && (
        <p className="micro" role="status">
          {status}
        </p>
      )}
      {suggested.length > 0 && (
        <ul className="suggested" aria-label={`Films playing near ${area}`}>
          {suggested.map((movie) => (
            <li key={movie.id}>
              <button
                type="button"
                className="suggestion"
                onClick={() => onTyped(movie.title)}
              >
                <Highlighted movie={movie} typed={typed} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
