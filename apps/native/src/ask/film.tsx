import type { Movie } from "@seatscout/client";
import type { ProgrammeState } from "@seatscout/view-logic";
import { markedIn, offeredFor, playingStatusOf } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Field } from "../design-system/field.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface FilmProps {
  readonly area: string | undefined;
  readonly programme: ProgrammeState;
  readonly date: string;
  readonly today: string;
  readonly typed: string;
  readonly focused: boolean;
  readonly onTyped: (typed: string) => void;
}

const styles = StyleSheet.create({
  offered: { gap: 8 },
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
    <TouchableOpacity
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
    </TouchableOpacity>
  );
};

export const Film = ({
  area,
  programme,
  date,
  today,
  typed,
  focused,
  onTyped,
}: FilmProps): ReactElement => {
  const status = playingStatusOf(programme, area, date, today);
  const offered = offeredFor(typed, programme.movies);

  return (
    <Field focused={focused} label="Film" onTyped={onTyped} value={typed}>
      {offered.length > 0 && (
        <View style={styles.offered}>
          {offered.map((movie) => (
            <Suggestion
              key={movie.id}
              movie={movie}
              onTyped={onTyped}
              typed={typed}
            />
          ))}
        </View>
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
