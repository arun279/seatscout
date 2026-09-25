import {
  ASKING,
  dayOf,
  daysIn,
  type Kind,
  type RawTerms,
  type Span,
  spanIn,
  spanOf,
  type Terms,
  timeOf,
  whenWordsOf,
} from "@seatscout/view-logic";
import { type ReactElement, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type Chip, Chips } from "../design-system/chips.js";
import { Section } from "../design-system/field.js";
import { PickerField } from "../design-system/picker-field.js";
import { Segments } from "../design-system/segments.js";
import { SpanField } from "../design-system/span-field.js";
import { TimeField } from "../design-system/time-field.js";
import { Type } from "../design-system/type.js";
import { dateAt, listingDate } from "../host/clock.js";

export interface WhenProps {
  readonly draft: Terms;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
  readonly onWindow: (window: Pick<RawTerms, "from" | "until">) => void;
}

interface EditorProps {
  readonly span: Span;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
}

const KINDS: readonly Kind[] = ["day", "days", "range", "any"];

const SEGMENTS: readonly Chip<Kind>[] = KINDS.map((value) => ({
  value,
  text: ASKING.kinds[value],
}));

const EVENING = "19:00";

const styles = StyleSheet.create({
  window: { flexDirection: "row", gap: 10 },
});

const OneDay = ({ span, today, onSpan }: EditorProps) => (
  <PickerField
    at={dateAt(span.date)}
    label={ASKING.when}
    mode="date"
    onPicked={(at) => onSpan({ date: listingDate(at) })}
    words={dayOf(span.date, today)}
  />
);

const SomeDays = ({ span, today, onSpan }: EditorProps) => {
  const dates = daysIn(span, today);
  return (
    <>
      <Chips
        chips={dates.map((date) => ({ value: date, text: dayOf(date, today) }))}
        chosen={dates}
        onChosen={(kept) => {
          if (kept.length > 0) onSpan(spanOf(kept, today));
        }}
      />
      <PickerField
        at={dateAt(dates.at(-1) ?? span.date)}
        label={ASKING.when}
        mode="date"
        onPicked={(at) => onSpan(spanOf([...dates, listingDate(at)], today))}
        words={ASKING.addDay}
      />
    </>
  );
};

const ARange = ({ span, today, onSpan }: EditorProps) => {
  const dates = daysIn(span, today);
  const first = dates[0] ?? span.date;
  const last = dates.at(-1) ?? first;
  return (
    <SpanField
      endWords={[dayOf(first, today), dayOf(last, today)]}
      first={first}
      labels={[ASKING.from, ASKING.until]}
      last={last}
      onSpan={(one, other) => onSpan(spanOf([`${one}..${other}`], today))}
      words={whenWordsOf(span, today)}
    />
  );
};

const AnyDay = ({ span, today }: EditorProps) => (
  <Type set="sentence" tone="silver">
    {whenWordsOf(span, today)}
  </Type>
);

const EDITORS: Readonly<Record<Kind, (props: EditorProps) => ReactElement>> = {
  day: OneDay,
  days: SomeDays,
  range: ARange,
  any: AnyDay,
};

const clockWords = (clock: string | undefined) =>
  clock === undefined ? ASKING.anyTime : timeOf(clock);

export const When = ({
  draft,
  today,
  onSpan,
  onWindow,
}: WhenProps): ReactElement => {
  const [kind, setKind] = useState<Kind>(draft.when?.kind ?? "day");
  const Editor = EDITORS[kind];

  return (
    <Section label={ASKING.when}>
      <Segments
        chosen={kind}
        onChosen={(chosen) => {
          setKind(chosen);
          onSpan(spanIn(chosen, draft.date, today));
        }}
        segments={SEGMENTS}
      />
      <Editor onSpan={onSpan} span={draft} today={today} />
      <View style={styles.window}>
        <TimeField
          clear={ASKING.clear}
          clock={draft.from}
          label={ASKING.from}
          onClock={(from) => onWindow({ from })}
          opensAt={EVENING}
          words={clockWords(draft.from)}
        />
        <TimeField
          clear={ASKING.clear}
          clock={draft.until}
          label={ASKING.until}
          onClock={(until) => onWindow({ until })}
          opensAt={EVENING}
          words={clockWords(draft.until)}
        />
      </View>
    </Section>
  );
};
