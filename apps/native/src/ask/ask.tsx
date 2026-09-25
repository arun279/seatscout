import {
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type SeatProfile,
  type SeatScout,
} from "@seatscout/client";
import type { RawTerms, Span, Term, Terms } from "@seatscout/view-logic";
import {
  ASKING,
  costOf,
  FIND_SEATS,
  movieOf,
  programmeNear,
  termsOf,
  titleOf,
} from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";
import { Velvet } from "../design-system/button.js";
import { type Chip, Chips } from "../design-system/chips.js";
import { Field, Section } from "../design-system/field.js";
import { Sheet } from "../design-system/sheet.js";
import { Stepper } from "../design-system/stepper.js";
import { Toggle } from "../design-system/toggle.js";
import { Type } from "../design-system/type.js";
import { Film } from "./film.js";
import { Profile } from "./profile.js";
import { When } from "./when.js";

export interface AskProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly focus: Term | undefined;
  readonly onKeep: () => void;
  readonly onFind: (terms: Terms, profile: SeatProfile) => void;
}

const SMALLEST_PARTY = 1;

const styles = StyleSheet.create({
  said: { textAlign: "center" },
});

const areaOf = ({ area = "" }: Terms) => area.trim() || undefined;

const named = <Named extends string>(
  every: readonly Named[],
): readonly Chip<Named>[] => every.map((value) => ({ value, text: value }));

const FORMATS = named(EVERY_FORMAT);
const AMENITIES = named(EVERY_AMENITY);
const CHAINS = named(EVERY_CHAIN);

export const Ask = ({
  seatscout,
  terms,
  profile: chosen,
  today,
  focus,
  onKeep,
  onFind,
}: AskProps): ReactElement => {
  const [draft, setDraft] = useState(terms);
  const [profile, setProfile] = useState(chosen);
  const [held, setHeld] = useState(() =>
    programmeNear(seatscout, areaOf(terms), terms.date),
  );
  const playing = useSyncExternalStore(held.subscribe, held.snapshot);
  const [typed, setTyped] = useState<string>();
  const [holding, setHolding] = useState(false);
  const film =
    typed ?? titleOf(playing.movies, terms.movie) ?? terms.movie ?? "";
  const cost = costOf(draft, today);

  const patch = (change: Partial<Terms>) => {
    const next = { ...draft, ...change };
    setDraft(next);
    return next;
  };

  const settle = (change: RawTerms) => {
    const next = termsOf({ ...draft, ...change }, today);
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
                profile,
              )
            }
          />
          {cost !== undefined && (
            <Type set="sentenceSmall" style={styles.said} tone="silverDim">
              {cost}
            </Type>
          )}
          <Type set="sentenceSmall" style={styles.said} tone="silverFaint">
            {ASKING.kept}
          </Type>
        </>
      }
      claimed={focus === "area" || focus === "movie"}
      heading={ASKING.heading}
      keep={ASKING.keep}
      onKeep={onKeep}
      scrolls={!holding}
    >
      <Field
        focused={focus === "area"}
        label={ASKING.area}
        onSettled={() => follow(draft)}
        onTyped={(area) => patch({ area })}
        value={draft.area ?? ""}
      >
        <Type set="sentenceSmall" tone="silverFaint">
          {ASKING.areaDecides}
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
      <When
        draft={draft}
        onSpan={({ date, when }: Span) => follow(settle({ date, when }))}
        onWindow={settle}
        today={today}
      />
      <Section label={ASKING.party}>
        <Stepper
          count={draft.partySize}
          fewer={ASKING.fewer}
          least={SMALLEST_PARTY}
          more={ASKING.more}
          onCount={(partySize) => patch({ partySize })}
        />
      </Section>
      <Toggle
        label={ASKING.accessible}
        on={draft.accessibleSeating === true}
        onToggle={(accessibleSeating) => patch({ accessibleSeating })}
        note={ASKING.accessibleNote}
      />
      <Section label={ASKING.format}>
        <Chips
          chips={FORMATS}
          chosen={draft.formats}
          onChosen={(formats) => patch({ formats })}
        />
      </Section>
      <Section label={ASKING.comfort}>
        <Chips
          chips={AMENITIES}
          chosen={draft.amenities}
          onChosen={(amenities) => patch({ amenities })}
        />
      </Section>
      <Section label={ASKING.chain}>
        <Chips
          chips={CHAINS}
          chosen={draft.chains}
          onChosen={(chains) => patch({ chains })}
        />
      </Section>
      {playing.theaters.length > 0 && (
        <Section label={ASKING.theater}>
          <Chips
            chips={playing.theaters.map(({ id, name }) => ({
              value: id,
              text: name,
            }))}
            chosen={draft.theaters}
            onChosen={(theaters) => patch({ theaters })}
          />
        </Section>
      )}
      <Profile onChange={setProfile} onHolding={setHolding} profile={profile} />
    </Sheet>
  );
};
