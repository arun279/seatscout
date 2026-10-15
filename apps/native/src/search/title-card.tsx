import type { SeatProfile } from "@seatscout/client";
import type {
  ProgrammeState,
  Term,
  Terms,
  TitleCardEntry,
} from "@seatscout/view-logic";
import { ASKING, titleCardOf } from "@seatscout/view-logic";
import {
  type MemoExoticComponent,
  memo,
  type ReactElement,
  type ReactNode,
} from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Pills, Tags } from "../design-system/chips.js";
import { TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import type { Palette, Role } from "../theme.js";
import { useTheme } from "../theme.js";

interface TitleCardProps {
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
}

const styles = StyleSheet.create({
  card: { gap: 2, paddingBottom: 6, paddingHorizontal: 18 },
  group: { borderBottomWidth: 1, gap: 2, paddingBottom: 12 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingVertical: 4,
  },
  words: { flexShrink: 1 },
  chevron: { fontSize: 16 },
});

interface RowProps {
  readonly words: string;
  readonly set: Role;
  readonly tone: keyof Palette;
  readonly faint?: boolean;
  readonly onPress: () => void;
}

const Row = ({ words, set, tone, faint = false, onPress }: RowProps) => (
  <TouchableOpacity
    accessibilityHint={faint ? ASKING.areaFirst : undefined}
    accessibilityLabel={words}
    accessibilityRole="button"
    onPress={onPress}
    style={styles.row}
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

const Group = ({
  testID,
  children,
}: {
  readonly testID: string;
  readonly children: ReactNode;
}) => {
  const { colours } = useTheme();

  return (
    <View
      style={[styles.group, { borderBottomColor: colours.hairline }]}
      testID={testID}
    >
      {children}
    </View>
  );
};

const opening =
  (onEdit: (term: Term) => void) =>
  ({ term, words }: TitleCardEntry) => ({
    text: words,
    onPress: () => onEdit(term),
  });

const filmTone = ({ area, movie }: Terms): keyof Palette => {
  if (area === undefined) return "silverFaint";
  return movie === undefined ? "beam" : "velvetLit";
};

const Card = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const card = titleCardOf(terms, programme, today, profile);
  const open = opening(onEdit);

  return (
    <View style={styles.card} testID="title-card">
      <Group testID="party-group">
        <Row
          onPress={() => onEdit("partySize")}
          set="marqueeTitle"
          tone="silver"
          words={card.party}
        />
        <Tags tags={card.seats.map(open)} />
      </Group>
      <Group testID="area-group">
        <Row
          onPress={() => onEdit("area")}
          set="marqueeTitle"
          tone={terms.area === undefined ? "beam" : "silver"}
          words={card.area}
        />
      </Group>
      <Group testID="movie-group">
        <Row
          faint={terms.area === undefined}
          onPress={() => onEdit("movie")}
          set="marqueeHero"
          tone={filmTone(terms)}
          words={card.movie}
        />
        <Tags tags={card.showing.map(open)} />
      </Group>
    </View>
  );
};

export const TitleCard: MemoExoticComponent<typeof Card> = memo(Card);

const Asked = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const card = titleCardOf(terms, programme, today, profile);
  const open = opening(onEdit);

  return (
    <View style={styles.card} testID="asked-card">
      <Pills
        tags={[
          { text: card.party, onPress: () => onEdit("partySize") },
          ...card.seats.map(open),
        ]}
      />
      <Pills tags={[{ text: card.area, onPress: () => onEdit("area") }]} />
      <Row
        onPress={() => onEdit("movie")}
        set="marqueeTitle"
        tone="velvetLit"
        words={card.movie}
      />
      <Pills tags={card.showing.map(open)} />
    </View>
  );
};

export const AskedCard: MemoExoticComponent<typeof Asked> = memo(Asked);
