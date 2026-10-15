import type { SeatProfile } from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import { ASKING, nextOf, titleCardOf } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Tags } from "../design-system/chips.js";
import { TOUCH_FLOOR } from "../design-system/touch.js";
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
  card: { paddingBottom: 6, paddingHorizontal: 18 },
  row: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingVertical: 4,
  },
  words: { flexShrink: 1 },
  chevron: { fontSize: 16 },
  chips: { paddingTop: 12 },
});

interface RowProps {
  readonly words: string;
  readonly set: Role;
  readonly tone: keyof Palette;
  readonly faint?: boolean;
  readonly onPress: () => void;
}

const Row = ({ words, set, tone, faint = false, onPress }: RowProps) => {
  const { colours } = useTheme();

  return (
    <TouchableOpacity
      accessibilityHint={faint ? ASKING.areaFirst : undefined}
      accessibilityLabel={words}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.row, { borderBottomColor: colours.hairline }]}
    >
      <Type set={set} style={styles.words} tone={tone}>
        {words}
      </Type>
      <Type
        set="sentenceStrong"
        style={styles.chevron}
        tone={faint ? "silverFaint" : "beam"}
      >
        ›
      </Type>
    </TouchableOpacity>
  );
};

const filmTone = (terms: Terms, lit: boolean): keyof Palette => {
  if (terms.movie !== undefined) return "velvetLit";
  return lit ? "beam" : "silverFaint";
};

export const TitleCard = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const card = titleCardOf(terms, programme, today, profile);
  const next = nextOf(terms);

  return (
    <View style={styles.card} testID="title-card">
      <Row
        onPress={() => onEdit("partySize")}
        set="marqueeTitle"
        tone="silver"
        words={card.party}
      />
      <Row
        onPress={() => onEdit("area")}
        set="marqueeTitle"
        tone={next === "area" ? "beam" : "silver"}
        words={card.area}
      />
      <Row
        faint={terms.area === undefined}
        onPress={() => onEdit("movie")}
        set="marqueeHero"
        tone={filmTone(terms, next === "movie")}
        words={card.movie}
      />
      <View style={styles.chips}>
        <Tags
          tags={card.chips.map(({ term, words }) => ({
            text: words,
            onPress: () => onEdit(term),
          }))}
        />
      </View>
    </View>
  );
};
