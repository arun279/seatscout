import type {
  SeatGroupResult,
  SeatProfile,
  SeatScout,
} from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  askedFrom,
  keyOf,
  ledeOf,
  NEXT_STEP,
  nextOf,
  programmeNear,
} from "@seatscout/view-logic";
import {
  type ReactElement,
  type ReactNode,
  useState,
  useSyncExternalStore,
} from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "../design-system/banner.js";
import { NextStep } from "../design-system/button.js";
import { Dock } from "../design-system/dock.js";
import { ScreenBand } from "../design-system/screen-band.js";
import { Type, useCrowded } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { useRemembered } from "../host/remembered.js";
import { useTheme } from "../theme.js";
import { Recent } from "./recent.js";
import { Results } from "./results.js";
import { TitleCard } from "./title-card.js";

export interface SearchProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly span?: number | undefined;
  readonly onAsk: (term: Term) => void;
  readonly onRun: (terms: Terms) => void;
  readonly onAdjust: (terms: Terms) => void;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
  readonly onLedger: () => void;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  read: { paddingBottom: 18 },
  lede: { paddingHorizontal: 18, paddingTop: 18 },
  said: { textAlign: "center" },
});

const Lede = ({
  terms,
  profile,
  today,
}: Pick<SearchProps, "terms" | "profile" | "today">) => (
  <Type set="sentenceSmall" style={styles.said} tone="silverDim">
    {ledeOf(terms, profile, today)}
  </Type>
);

const Prompt = ({
  seatscout,
  terms,
  programme,
  profile,
  today,
  span,
  banner,
  onAsk,
  onRun,
  onAdjust,
}: Pick<
  SearchProps,
  | "seatscout"
  | "terms"
  | "profile"
  | "today"
  | "span"
  | "onAsk"
  | "onRun"
  | "onAdjust"
> & {
  readonly programme: ProgrammeState;
  readonly banner: ReactNode;
}) => {
  const crowded = useCrowded();
  const next = nextOf(terms);
  const lede = <Lede profile={profile} terms={terms} today={today} />;

  return (
    <>
      <ScrollView contentContainerStyle={styles.read} style={styles.screen}>
        <ScreenBand span={span} />
        <TitleCard
          onEdit={onAsk}
          onRun={onAdjust}
          profile={profile}
          programme={programme}
          terms={terms}
          today={today}
        />
        {crowded && <View style={styles.lede}>{lede}</View>}
        <Recent
          onRun={onRun}
          remembered={useRemembered(seatscout)}
          today={today}
        />
      </ScrollView>
      {banner}
      <Dock>
        {!crowded && lede}
        <NextStep label={NEXT_STEP[next]} onPress={() => onAsk(next)} />
      </Dock>
    </>
  );
};

export const Search = ({
  seatscout,
  terms,
  profile,
  today,
  clock,
  online,
  span,
  onAsk,
  onRun,
  onAdjust,
  onRoom,
  onHandOff,
  onLedger,
}: SearchProps): ReactElement => {
  const theme = useTheme();
  const [playing] = useState(() =>
    programmeNear(seatscout, terms.area, terms.date),
  );
  const programme = useSyncExternalStore(playing.subscribe, playing.snapshot);
  const asked = askedFrom(terms, profile, today);
  const banner = !online && <Banner />;

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      style={[styles.screen, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      {asked === null ? (
        <Prompt
          banner={banner}
          onAdjust={onAdjust}
          onAsk={onAsk}
          onRun={onRun}
          profile={profile}
          programme={programme}
          seatscout={seatscout}
          span={span}
          terms={terms}
          today={today}
        />
      ) : (
        <SafeAreaView
          edges={["bottom"]}
          style={styles.screen}
          testID="results-stage"
        >
          <Results
            asked={asked}
            clock={clock}
            key={keyOf(asked)}
            onEdit={onAsk}
            onHandOff={onHandOff}
            online={online}
            onLedger={onLedger}
            onRoom={onRoom}
            onRun={onAdjust}
            profile={profile}
            programme={programme}
            seatscout={seatscout}
            span={span}
            terms={terms}
            today={today}
          />
          {banner}
        </SafeAreaView>
      )}
    </SafeAreaView>
  );
};
