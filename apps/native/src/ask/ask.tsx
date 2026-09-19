import type { SeatScout } from "@seatscout/client";
import type { Term, Terms } from "@seatscout/view-logic";
import {
  dayOf,
  FIND_SEATS,
  movieOf,
  programmeNear,
  termsOf,
  titleOf,
} from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";
import { Velvet } from "../design-system/button.js";
import { DateField } from "../design-system/date-field.js";
import { Field, Section } from "../design-system/field.js";
import { Sheet } from "../design-system/sheet.js";
import { Stepper } from "../design-system/stepper.js";
import { Type } from "../design-system/type.js";
import { Film } from "./film.js";

export interface AskProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly today: string;
  readonly focus: Term | undefined;
  readonly onKeep: () => void;
  readonly onFind: (terms: Terms) => void;
}

const SMALLEST_PARTY = 1;

const styles = StyleSheet.create({
  privacy: { textAlign: "center" },
});

const areaOf = ({ area = "" }: Terms) => area.trim() || undefined;

export const Ask = ({
  seatscout,
  terms,
  today,
  focus,
  onKeep,
  onFind,
}: AskProps): ReactElement => {
  const [draft, setDraft] = useState(terms);
  const [held, setHeld] = useState(() =>
    programmeNear(seatscout, areaOf(terms), terms.date),
  );
  const playing = useSyncExternalStore(held.subscribe, held.snapshot);
  const [typed, setTyped] = useState<string>();
  const film =
    typed ?? titleOf(playing.movies, terms.movie) ?? terms.movie ?? "";

  const patch = (change: Partial<Terms>) => {
    const next = { ...draft, ...change };
    setDraft(next);
    return next;
  };

  const follow = (next: Terms) => {
    const area = areaOf(next);
    if (held.area !== area || held.date !== next.date)
      setHeld(programmeNear(seatscout, area, next.date));
  };

  return (
    <Sheet
      dock={
        <>
          <Velvet
            label={FIND_SEATS}
            onPress={() =>
              onFind(
                termsOf(
                  { ...draft, movie: movieOf(film, playing.movies) },
                  today,
                ),
              )
            }
          />
          <Type set="sentenceSmall" style={styles.privacy} tone="silverFaint">
            Preferences and history stay on this phone. No account exists.
          </Type>
        </>
      }
      heading="What are we seeing?"
      keep="Keep as it was"
      onKeep={onKeep}
    >
      <Field
        focused={focus === "area"}
        label="Near, by postal code"
        onSettled={() => follow(draft)}
        onTyped={(area) => patch({ area })}
        value={draft.area ?? ""}
      >
        <Type set="sentenceSmall" tone="silverFaint">
          The films and theaters below are the ones playing near it.
        </Type>
      </Field>
      <Film
        area={held.area}
        date={held.date}
        focused={focus === "movie"}
        onTyped={setTyped}
        programme={playing}
        today={today}
        typed={film}
      />
      <DateField
        date={draft.date}
        label="When"
        onDate={(date) => follow(patch({ date }))}
        words={dayOf(draft.date, today)}
      />
      <Section label="Party">
        <Stepper
          count={draft.partySize}
          fewer="Fewer seats"
          least={SMALLEST_PARTY}
          more="More seats"
          onCount={(partySize) => patch({ partySize })}
        />
      </Section>
    </Sheet>
  );
};
