import type { SeatProfile } from "@seatscout/client";
import type {
  ProgrammeState,
  Term,
  Terms,
  TitleCardEntry,
} from "@seatscout/view-logic";
import {
  ANOTHER_NUMBER,
  daysOf,
  PICK_DAYS,
  partiesOf,
  termLinesOf,
  termsOf,
  YOUR_QUERY,
} from "@seatscout/view-logic";
import { Fragment, type ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import { TermMenu } from "../design-system/term-menu.js";
import { TOKEN_GAP, Token } from "../design-system/token.js";
import { Type } from "../design-system/type.js";

export interface TitleCardProps {
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly onEdit: (term: Term) => void;
  readonly onRun: (terms: Terms) => void;
}

const styles = StyleSheet.create({
  card: { gap: TOKEN_GAP, paddingBottom: 6, paddingHorizontal: 18 },
  line: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: TOKEN_GAP,
  },
});

const Detail = ({
  entry,
  blank,
  onEdit,
}: {
  readonly entry: TitleCardEntry;
  readonly blank: boolean;
  readonly onEdit: (term: Term) => void;
}) => (
  <Fragment>
    {entry.joinedBy !== undefined && (
      <Type set="ledgerField" tone="silverDim">
        {entry.joinedBy}
      </Type>
    )}
    <Token
      blank={blank}
      onPress={() => onEdit(entry.term)}
      set="ledgerField"
      tone="silver"
      words={entry.words}
    />
  </Fragment>
);

export const TitleCard = ({
  terms,
  programme,
  profile,
  today,
  onEdit,
  onRun,
}: TitleCardProps): ReactElement => {
  const [[party], [movie], [day, ...details]] = termLinesOf(
    terms,
    programme,
    today,
    profile,
  );

  return (
    <View style={styles.card} testID="title-card">
      <Type accessibilityRole="header" set="ledgerLabel" tone="silverFaint">
        {YOUR_QUERY}
      </Type>
      <TermMenu
        choices={partiesOf(terms.partySize)}
        more={ANOTHER_NUMBER}
        onChoose={(partySize) => onRun({ ...terms, partySize })}
        onMore={() => onEdit("partySize")}
        set="marqueeTitle"
        tone="silver"
        words={party.words}
      />
      <Token
        blank={terms.movie === undefined}
        onPress={() => onEdit("movie")}
        set="marqueeHero"
        tone="velvetLit"
        words={movie.words}
      />
      <View style={styles.line}>
        <TermMenu
          choices={daysOf(terms, today)}
          more={PICK_DAYS}
          onChoose={({ date, when }) =>
            onRun(termsOf({ ...terms, date, when }, today))
          }
          onMore={() => onEdit("date")}
          set="ledgerField"
          tone="silver"
          words={day.words}
        />
        {details.map((entry) => (
          <Detail
            blank={entry.term === "area" && terms.area === undefined}
            entry={entry}
            key={entry.words}
            onEdit={onEdit}
          />
        ))}
      </View>
    </View>
  );
};
