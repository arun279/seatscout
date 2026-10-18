import type { SeatProfile } from "@seatscout/client";
import type {
  ProgrammeState,
  Term,
  Terms,
  TitleCardEntry,
} from "@seatscout/view-logic";
import { ASKING, nextOf, titleCardOf } from "@seatscout/view-logic";
import { type MemoExoticComponent, memo, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { Tags, TagStrip } from "../design-system/chips.js";
import { Press } from "../design-system/press.js";
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

const INSET = 18;

const styles = StyleSheet.create({
  card: { paddingBottom: 6, paddingHorizontal: INSET },
  groups: { paddingTop: 4 },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingVertical: 2,
  },
  words: { flexShrink: 1 },
  lit: { borderBottomWidth: 3, paddingBottom: 3 },
  chevron: { fontSize: 16 },
});

interface RowProps {
  readonly words: string;
  readonly set: Role;
  readonly tone: keyof Palette;
  readonly lit?: boolean;
  readonly shut?: boolean;
  readonly onPress: () => void;
}

const Row = ({
  words,
  set,
  tone,
  lit = false,
  shut = false,
  onPress,
}: RowProps) => {
  const { colours } = useTheme();

  return (
    <Press
      accessibilityHint={shut ? ASKING.areaFirst : undefined}
      accessibilityLabel={words}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.row}
    >
      <View
        style={[
          styles.words,
          lit && [styles.lit, { borderBottomColor: colours.beam }],
        ]}
      >
        <Type set={set} tone={lit ? "beam" : tone}>
          {words}
        </Type>
      </View>
      {!shut && (
        <Type
          set="sentenceStrong"
          style={styles.chevron}
          tone={lit ? "beam" : "silverFaint"}
        >
          ›
        </Type>
      )}
    </Press>
  );
};

const opening =
  (onEdit: (term: Term) => void) =>
  ({ term, words }: TitleCardEntry) => ({
    text: words,
    onPress: () => onEdit(term),
  });

const Card = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
}: TitleCardProps): ReactElement => {
  const card = titleCardOf(terms, programme, today, profile);
  const open = opening(onEdit);
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
        lit={next === "area"}
        onPress={() => onEdit("area")}
        set="marqueeTitle"
        tone="silver"
        words={card.area}
      />
      <Row
        lit={next === "movie"}
        onPress={() => onEdit("movie")}
        set="marqueeHero"
        shut={next === "area"}
        tone={next === "area" ? "silverFaint" : "velvetLit"}
        words={card.movie}
      />
      <View style={styles.groups}>
        {card.groups.map(({ lead, entries }) => (
          <Tags key={lead} lead={lead} tags={entries.map(open)} />
        ))}
      </View>
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
      <Row
        onPress={() => onEdit("movie")}
        set="marqueeHero"
        tone="velvetLit"
        words={card.movie}
      />
      <Row
        onPress={() => onEdit("partySize")}
        set="marqueeRow"
        tone="silver"
        words={card.party}
      />
      <Row
        onPress={() => onEdit("area")}
        set="marqueeRow"
        tone="silver"
        words={card.area}
      />
      <TagStrip
        inset={INSET}
        tags={card.groups.flatMap(({ entries }) => entries).map(open)}
      />
    </View>
  );
};

export const AskedCard: MemoExoticComponent<typeof Asked> = memo(Asked);
