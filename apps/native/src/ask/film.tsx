import type { Movie } from "@seatscout/client";
import type { ProgrammeState, Span } from "@seatscout/view-logic";
import {
  ASKING,
  markedIn,
  offeredFor,
  playingStatusOf,
} from "@seatscout/view-logic";
import type { ReactElement, Ref } from "react";
import type { TextInput } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { Field } from "../design-system/field.js";
import { Press } from "../design-system/press.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface FilmProps {
  readonly area: string | undefined;
  readonly programme: ProgrammeState;
  readonly span: Span;
  readonly today: string;
  readonly typed: string;
  readonly ref?: Ref<TextInput>;
  readonly onTyped: (typed: string) => void;
}

const styles = StyleSheet.create({
  offered: { maxHeight: 3 * 48 + 2 * 8 },
  listed: { gap: 8 },
  suggestion: {
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
});

const Suggestion = ({
  movie,
  typed,
  onTyped,
}: {
  readonly movie: Movie;
  readonly typed: string;
  readonly onTyped: (typed: string) => void;
}) => {
  const theme = useTheme();
  const [before, marked, after] = markedIn(movie.title, typed);

  return (
    <Press
      accessibilityLabel={movie.title}
      accessibilityRole="button"
      onPress={() => onTyped(movie.title)}
      style={[
        styles.suggestion,
        {
          backgroundColor: theme.colours.raised,
          borderColor: theme.colours.hairline,
        },
      ]}
    >
      <Type set="sentence" tone="silver">
        {before}
        <Type set="sentence" tone="velvetLit">
          {marked}
        </Type>
        {after}
      </Type>
    </Press>
  );
};

export const Film = ({
  area,
  programme,
  span,
  today,
  typed,
  ref,
  onTyped,
}: FilmProps): ReactElement => {
  const status = playingStatusOf(programme, area, span, today);
  const offered = offeredFor(typed, programme.movies);

  return (
    <Field
      focused
      label={ASKING.film}
      onTyped={onTyped}
      ref={ref}
      value={typed}
    >
      {offered.length > 0 && (
        <ScrollView
          accessibilityLabel={`Films playing near ${area}`}
          accessibilityRole="list"
          contentContainerStyle={styles.listed}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={styles.offered}
          testID="offered"
        >
          {offered.map((movie) => (
            <View key={movie.id} role="listitem">
              <Suggestion movie={movie} onTyped={onTyped} typed={typed} />
            </View>
          ))}
        </ScrollView>
      )}
      <Type
        accessibilityLiveRegion="polite"
        role="status"
        set="ledgerRow"
        tone={status.unreadable ? "velvetLit" : "silverFaint"}
      >
        {status.words}
      </Type>
    </Field>
  );
};
