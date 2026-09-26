import type {
  SeatGroupResult,
  SeatProfile,
  SeatScout,
} from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  askedFrom,
  FIND_SEATS,
  ledeOf,
  programmeNear,
} from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "../design-system/banner.js";
import { Velvet } from "../design-system/button.js";
import { ScreenBand } from "../design-system/screen-band.js";
import { Type } from "../design-system/type.js";
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
  readonly onAsk: (term: Term) => void;
  readonly onRun: (terms: Terms) => void;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
  readonly onLedger: () => void;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  lede: { paddingHorizontal: 18, paddingTop: 18 },
  commit: { paddingHorizontal: 18, paddingTop: 16 },
});

const Prompt = ({
  terms,
  programme,
  remembered,
  profile,
  today,
  onAsk,
  onRun,
}: Pick<SearchProps, "terms" | "profile" | "today" | "onAsk" | "onRun"> & {
  readonly programme: ProgrammeState;
  readonly remembered: ReturnType<typeof useRemembered>;
}) => (
  <ScrollView>
    <ScreenBand />
    <TitleCard
      onEdit={onAsk}
      profile={profile}
      programme={programme}
      terms={terms}
      today={today}
    />
    <View style={styles.lede}>
      <Type set="sentence" tone="silverDim">
        {ledeOf(terms, profile, today)}
      </Type>
    </View>
    <View style={styles.commit}>
      <Velvet
        label={FIND_SEATS}
        onPress={() => onAsk(terms.area === undefined ? "area" : "movie")}
      />
    </View>
    <Recent onRun={onRun} remembered={remembered} today={today} />
  </ScrollView>
);

export const Search = ({
  seatscout,
  terms,
  profile,
  today,
  clock,
  online,
  onAsk,
  onRun,
  onRoom,
  onHandOff,
  onLedger,
}: SearchProps): ReactElement => {
  const theme = useTheme();
  const [playing] = useState(() =>
    programmeNear(seatscout, terms.area, terms.date),
  );
  const programme = useSyncExternalStore(playing.subscribe, playing.snapshot);
  const remembered = useRemembered(seatscout, terms);
  const asked = askedFrom(terms, profile, today);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      {asked === null ? (
        <Prompt
          onAsk={onAsk}
          onRun={onRun}
          profile={profile}
          programme={programme}
          remembered={remembered}
          terms={terms}
          today={today}
        />
      ) : (
        <Results
          asked={asked}
          clock={clock}
          key={JSON.stringify(asked)}
          onEdit={onAsk}
          onHandOff={onHandOff}
          online={online}
          onLedger={onLedger}
          onRoom={onRoom}
          profile={profile}
          programme={programme}
          seatscout={seatscout}
          terms={terms}
          today={today}
        />
      )}
      {!online && <Banner />}
    </SafeAreaView>
  );
};
