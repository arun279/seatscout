import {
  EVERY_AMENITY,
  EVERY_CHAIN,
  EVERY_FORMAT,
  type SeatProfile,
} from "@seatscout/client";
import type {
  ProgrammeState,
  RawTerms,
  Span,
  Term,
  Terms,
} from "@seatscout/view-logic";
import { ASKING } from "@seatscout/view-logic";
import type { ReactElement, Ref } from "react";
import type { TextInput } from "react-native";
import { View } from "react-native";
import { type Chip, Chips } from "../design-system/chips.js";
import { Field, SECTION, Section } from "../design-system/field.js";
import { Stepper } from "../design-system/stepper.js";
import { Toggle } from "../design-system/toggle.js";
import { Type } from "../design-system/type.js";
import { Film } from "./film.js";
import { Profile } from "./profile.js";
import { When, Window } from "./when.js";

export interface EditorProps {
  readonly draft: Terms;
  readonly today: string;
  readonly area: string | undefined;
  readonly playing: ProgrammeState;
  readonly film: string;
  readonly profile: SeatProfile;
  readonly field: Ref<TextInput>;
  readonly onChange: (change: Partial<Terms>) => void;
  readonly onSettle: (change: RawTerms) => Terms;
  readonly onFollow: (terms: Terms) => void;
  readonly onTyped: (typed: string) => void;
  readonly onProfile: (profile: SeatProfile) => void;
  readonly onHolding: (holding: boolean) => void;
}

const SMALLEST_PARTY = 1;

const named = <Named extends string>(
  every: readonly Named[],
): readonly Chip<Named>[] => every.map((value) => ({ value, text: value }));

const FORMATS = named(EVERY_FORMAT);
const AMENITIES = named(EVERY_AMENITY);
const CHAINS = named(EVERY_CHAIN);

const Area = ({ draft, field, onChange, onFollow }: EditorProps) => (
  <Field
    focused
    label={ASKING.area}
    onSettled={() => onFollow(draft)}
    onTyped={(area) => onChange({ area })}
    ref={field}
    value={draft.area ?? ""}
  >
    <Type set="sentenceSmall" tone="silverFaint">
      {ASKING.areaDecides}
    </Type>
  </Field>
);

const AreaFirst = () => (
  <View style={SECTION}>
    <Type set="sentenceLead" tone="silver">
      {ASKING.areaFirst}
    </Type>
    <Type set="sentence" tone="silverDim">
      {ASKING.areaFirstWhy}
    </Type>
  </View>
);

const Movie = ({
  area,
  draft,
  today,
  playing,
  film,
  field,
  onTyped,
}: EditorProps) =>
  area === undefined ? (
    <AreaFirst />
  ) : (
    <Film
      area={area}
      onTyped={onTyped}
      programme={playing}
      ref={field}
      span={draft}
      today={today}
      typed={film}
    />
  );

const Days = ({ draft, today, onSettle, onFollow }: EditorProps) => (
  <When
    draft={draft}
    onSpan={({ date, when }: Span) => onFollow(onSettle({ date, when }))}
    today={today}
  />
);

const TimeOfDay = ({ draft, onSettle }: EditorProps) => (
  <Window draft={draft} onWindow={onSettle} />
);

const Seats = ({ draft, onChange }: EditorProps) => (
  <>
    <View style={SECTION}>
      <Stepper
        count={draft.partySize}
        fewer={ASKING.fewer}
        least={SMALLEST_PARTY}
        more={ASKING.more}
        onCount={(partySize) => onChange({ partySize })}
      />
    </View>
    <Toggle
      label={ASKING.accessible}
      note={ASKING.accessibleNote}
      on={draft.accessibleSeating === true}
      onToggle={(accessibleSeating) => onChange({ accessibleSeating })}
    />
  </>
);

const Showtimes = ({ draft, playing, onChange }: EditorProps) => (
  <>
    <Section label={ASKING.format}>
      <Chips
        chips={FORMATS}
        chosen={draft.formats}
        onChosen={(formats) => onChange({ formats })}
      />
    </Section>
    <Section label={ASKING.comfort}>
      <Chips
        chips={AMENITIES}
        chosen={draft.amenities}
        onChosen={(amenities) => onChange({ amenities })}
      />
    </Section>
    <Section label={ASKING.chain}>
      <Chips
        chips={CHAINS}
        chosen={draft.chains}
        onChosen={(chains) => onChange({ chains })}
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
          onChosen={(theaters) => onChange({ theaters })}
        />
      </Section>
    )}
  </>
);

const Sitting = ({ profile, onProfile, onHolding }: EditorProps) => (
  <Profile onChange={onProfile} onHolding={onHolding} profile={profile} />
);

const EDITORS: Readonly<Record<Term, (props: EditorProps) => ReactElement>> = {
  area: Area,
  movie: Movie,
  date: Days,
  window: TimeOfDay,
  partySize: Seats,
  showtimes: Showtimes,
  profile: Sitting,
};

export const Editor = ({
  editing,
  ...props
}: EditorProps & { readonly editing: Term }): ReactElement => {
  const Shown = EDITORS[editing];
  return <Shown {...props} />;
};
