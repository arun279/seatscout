import {
  ASKING,
  daysIn,
  horizonFrom,
  type Span,
  spanOf,
  type Terms,
  timeOf,
  whenWordsOf,
} from "@seatscout/view-logic";
import { type ReactElement, useState } from "react";
import { StyleSheet, View } from "react-native";
import { type Chip, Chips } from "../design-system/chips.js";
import { PickerField } from "../design-system/date-field.js";
import { Section } from "../design-system/field.js";
import { Segments } from "../design-system/segments.js";
import { SpanField } from "../design-system/span-field.js";
import { TimeField } from "../design-system/time-field.js";
import { Type } from "../design-system/type.js";
import { dateAt, listingDate } from "../host/clock.js";

type Reading = "day" | "days" | "range" | "any";

export interface WhenProps {
  readonly draft: Terms;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
  readonly onWindow: (window: {
    readonly from?: string | undefined;
    readonly until?: string | undefined;
  }) => void;
}

interface EditorProps {
  readonly span: Span;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
}

const [ONE_DAY, SOME_DAYS, A_RANGE, ANY_DAY] = ASKING.readings;

const SEGMENTS: readonly Chip<Reading>[] = [
  { value: "day", text: ONE_DAY },
  { value: "days", text: SOME_DAYS },
  { value: "range", text: A_RANGE },
  { value: "any", text: ANY_DAY },
];

const styles = StyleSheet.create({
  window: { flexDirection: "row", gap: 10 },
});

const dayWords = (date: string, today: string) => whenWordsOf({ date }, today);

const OneDay = ({ span, today, onSpan }: EditorProps) => (
  <PickerField
    at={dateAt(span.date)}
    label={ASKING.when}
    mode="date"
    onPicked={(at) => onSpan({ date: listingDate(at) })}
    words={dayWords(span.date, today)}
  />
);

const SomeDays = ({ span, today, onSpan }: EditorProps) => {
  const dates = daysIn(span, today);
  return (
    <>
      <Chips
        chips={dates.map((date) => ({
          value: date,
          text: dayWords(date, today),
        }))}
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
      first={first}
      labels={[ASKING.from, ASKING.until]}
      last={last}
      onSpan={(from, to) => onSpan(spanOf([`${from}..${to}`], today))}
      said={whenWordsOf(span, today)}
      words={[dayWords(first, today), dayWords(last, today)]}
    />
  );
};

const AnyDay = ({ span, today }: EditorProps) => (
  <Type set="sentence" tone="silver">
    {whenWordsOf(span, today)}
  </Type>
);

const EDITORS: Readonly<Record<Reading, (props: EditorProps) => ReactElement>> =
  { day: OneDay, days: SomeDays, range: ARange, any: AnyDay };

const spanFor = (reading: Reading, date: string, today: string): Span => {
  switch (reading) {
    case "day":
    case "days":
      return { date };
    case "range":
      return horizonFrom(date);
    case "any":
      return spanOf(["any"], today);
  }
};

const clockWords = (clock: string | undefined) =>
  clock === undefined ? ASKING.anyTime : timeOf(clock);

export const When = ({
  draft,
  today,
  onSpan,
  onWindow,
}: WhenProps): ReactElement => {
  const [reading, setReading] = useState<Reading>(draft.when?.reading ?? "day");
  const Editor = EDITORS[reading];

  return (
    <Section label={ASKING.when}>
      <Segments
        chosen={reading}
        onChosen={(chosen) => {
          setReading(chosen);
          onSpan(spanFor(chosen, draft.date, today));
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
          words={clockWords(draft.from)}
        />
        <TimeField
          clear={ASKING.clear}
          clock={draft.until}
          label={ASKING.until}
          onClock={(until) => onWindow({ until })}
          words={clockWords(draft.until)}
        />
      </View>
    </Section>
  );
};
