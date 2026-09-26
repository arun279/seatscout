import {
  ASKING,
  type Kind,
  markOf,
  spanOf,
  type RawTerms,
  type Span,
  spanIn,
  tapped,
  type Terms,
  valuesOf,
  timeOf,
  whenWordsOf,
} from "@seatscout/view-logic";
import {
  memo,
  type ReactElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { Calendar } from "../design-system/calendar.js";
import type { Chip } from "../design-system/chips.js";
import { Section } from "../design-system/field.js";
import { Segments } from "../design-system/segments.js";
import { TimeField } from "../design-system/time-field.js";
import { Type } from "../design-system/type.js";

export interface WhenProps {
  readonly draft: Terms;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
  readonly onWindow: (window: Pick<RawTerms, "from" | "until">) => void;
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

interface DaysProps {
  readonly values: string;
  readonly kind: Kind;
  readonly today: string;
  readonly onSpan: (span: Span) => void;
}

const Days = memo(({ values, kind, today, onSpan }: DaysProps) => {
  const span = useMemo(() => spanOf(values.split(" "), today), [values, today]);
  const mark = useMemo(() => markOf(span, today), [span, today]);
  const onDay = useCallback(
    (date: string) => onSpan(tapped(kind, span, date, today)),
    [kind, span, today, onSpan],
  );
  return (
    <Calendar
      mark={mark}
      onDay={kind === "any" ? undefined : onDay}
      opensOn={span.date}
      today={today}
    />
  );
});

const clockWords = (clock: string | undefined) =>
  clock === undefined ? ASKING.anyTime : timeOf(clock);

export const When = ({
  draft,
  today,
  onSpan,
  onWindow,
}: WhenProps): ReactElement => {
  const [kind, setKind] = useState<Kind>(draft.when?.kind ?? "day");
  const latest = useRef(onSpan);
  latest.current = onSpan;
  const spanned = useCallback((span: Span) => latest.current(span), []);

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
      <Type set="sentence" tone="silver">
        {whenWordsOf(draft, today)}
      </Type>
      <Days
        kind={kind}
        onSpan={spanned}
        today={today}
        values={valuesOf(draft).join(" ")}
      />
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
