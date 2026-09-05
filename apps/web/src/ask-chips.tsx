import type { Theater } from "@seatscout/client";
import type { Term } from "./title-card.js";

interface ChipsProps<Named extends string> {
  readonly term: Term;
  readonly legend: string;
  readonly every: readonly Named[];
  readonly chosen: readonly Named[] | undefined;
  readonly onChosen: (chosen: readonly Named[]) => void;
}

interface TheaterChipsProps {
  readonly theaters: readonly Theater[];
  readonly chosen: readonly string[] | undefined;
  readonly onChosen: (chosen: readonly string[]) => void;
}

interface Chip<Named extends string> {
  readonly value: Named;
  readonly text: string;
}

interface ChipGroupProps<Named extends string> {
  readonly term: Term;
  readonly legend: string;
  readonly chips: readonly Chip<Named>[];
  readonly chosen: readonly Named[] | undefined;
  readonly onChosen: (chosen: readonly Named[]) => void;
}

const toggled = <Named extends string>(
  every: readonly Named[],
  chosen: readonly Named[],
  value: Named,
): readonly Named[] => {
  const pressed = new Set(chosen);
  if (pressed.has(value)) pressed.delete(value);
  else pressed.add(value);
  return every.filter((named) => pressed.has(named));
};

const ChipGroup = <Named extends string>({
  term,
  legend,
  chips,
  chosen = [],
  onChosen,
}: ChipGroupProps<Named>) => (
  <fieldset className="field chips">
    <legend className="eyebrow">{legend}</legend>
    {chips.map((chip, at) => (
      <button
        key={chip.value}
        type="button"
        className="chip"
        aria-pressed={chosen.includes(chip.value)}
        data-term={at === 0 ? term : undefined}
        onClick={() =>
          onChosen(
            toggled(
              chips.map((named) => named.value),
              chosen,
              chip.value,
            ),
          )
        }
      >
        {chip.text}
      </button>
    ))}
  </fieldset>
);

export const Chips = <Named extends string>({
  every,
  ...group
}: ChipsProps<Named>) => (
  <ChipGroup
    {...group}
    chips={every.map((value) => ({ value, text: value }))}
  />
);

export const TheaterChips = ({
  theaters,
  chosen,
  onChosen,
}: TheaterChipsProps) => (
  <ChipGroup
    term="theaters"
    legend="Theater"
    chips={theaters.map((theater) => ({
      value: theater.id,
      text: theater.name,
    }))}
    chosen={chosen}
    onChosen={onChosen}
  />
);
