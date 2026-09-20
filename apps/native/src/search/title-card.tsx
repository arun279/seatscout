import type { SeatProfile } from "@seatscout/client";
import type {
  ProgrammeState,
  Term,
  Terms,
  TitleCardEntry,
} from "@seatscout/view-logic";
import { termLinesOf } from "@seatscout/view-logic";
import { Fragment, type ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SLOP, TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import type { Palette, Role } from "../theme.js";
import { useTheme } from "../theme.js";

export interface TitleCardProps {
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

const styles = StyleSheet.create({
  card: { gap: 7, paddingBottom: 6, paddingHorizontal: 22, paddingTop: 10 },
  line: { alignItems: "baseline", flexDirection: "row", flexWrap: "wrap" },
  term: {
    justifyContent: "center",
    minWidth: TOUCH_FLOOR - SLOP.left - SLOP.right,
  },
  underline: {
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

const Line = ({
  entries,
  set,
  tone,
  ruled,
  onEdit,
}: {
  readonly entries: readonly TitleCardEntry[];
  readonly set: Role;
  readonly tone: keyof Palette;
  readonly ruled: keyof Palette;
  readonly onEdit: (term: Term) => void;
}) => {
  const theme = useTheme();

  return (
    <View style={styles.line}>
      {entries.map((entry, at) => (
        <Fragment key={entry.words}>
          {at > 0 && (
            <Type set={set} tone="silverFaint">
              {entry.joinedBy ?? " · "}
            </Type>
          )}
          <TouchableOpacity
            accessibilityRole="button"
            hitSlop={SLOP}
            onPress={() => onEdit(entry.term)}
            style={[
              styles.term,
              { minHeight: theme.type[set].size * theme.type[set].leading },
            ]}
          >
            <Type
              set={set}
              style={[
                styles.underline,
                { textDecorationColor: theme.colours[ruled] },
              ]}
              tone={tone}
            >
              {entry.words}
            </Type>
          </TouchableOpacity>
        </Fragment>
      ))}
    </View>
  );
};

export const TitleCard = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const [party, movie, details] = termLinesOf(terms, programme, today, profile);

  return (
    <View style={styles.card} testID="title-card">
      <Type set="ledgerLabel" tone="silverFaint">
        Your query · tap any line to change it
      </Type>
      <Line
        entries={party}
        onEdit={onEdit}
        ruled="hairline"
        set="marqueeTitle"
        tone="silver"
      />
      <Line
        entries={movie}
        onEdit={onEdit}
        ruled="hairline"
        set="marqueeHero"
        tone={terms.movie === undefined ? "silverFaint" : "velvetLit"}
      />
      <Line
        entries={details}
        onEdit={onEdit}
        ruled="silverFaint"
        set="ledger"
        tone="silverDim"
      />
    </View>
  );
};
