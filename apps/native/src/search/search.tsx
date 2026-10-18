import type {
  HouseLights,
  SeatGroupResult,
  SeatProfile,
  SeatScout,
} from "@seatscout/client";
import type { ProgrammeState, Term, Terms } from "@seatscout/view-logic";
import {
  askedFrom,
  keyOf,
  ledeOf,
  nextStepOf,
  programmeNear,
} from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "../design-system/banner.js";
import { Velvet } from "../design-system/button.js";
import { Dock } from "../design-system/dock.js";
import { ScreenBand } from "../design-system/screen-band.js";
import { Type } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { useRemembered } from "../host/remembered.js";
import { useTheme } from "../theme.js";
import { HouseLightsControl } from "./house-lights.js";
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
  readonly lights: HouseLights;
  readonly onLights: (lights: HouseLights) => void;
  readonly onAsk: (term: Term) => void;
  readonly onRun: (terms: Terms) => void;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
  readonly onLedger: () => void;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  lede: { paddingHorizontal: 18, paddingTop: 10 },
});

const Remembered = ({
  seatscout,
  today,
  onRun,
}: Pick<SearchProps, "seatscout" | "today" | "onRun">) => (
  <Recent onRun={onRun} remembered={useRemembered(seatscout)} today={today} />
);

const Prompt = ({
  seatscout,
  terms,
  programme,
  profile,
  today,
  lights,
  onLights,
  onAsk,
  onRun,
}: Pick<
  SearchProps,
  | "seatscout"
  | "terms"
  | "profile"
  | "today"
  | "lights"
  | "onLights"
  | "onAsk"
  | "onRun"
> & {
  readonly programme: ProgrammeState;
}) => (
  <>
    <ScrollView style={styles.screen} testID="prompt">
      <ScreenBand />
      <TitleCard
        onEdit={onAsk}
        profile={profile}
        programme={programme}
        terms={terms}
        today={today}
      />
      <Type set="sentence" style={styles.lede} tone="silverDim">
        {ledeOf(terms)}
      </Type>
      <Remembered onRun={onRun} seatscout={seatscout} today={today} />
      <HouseLightsControl chosen={lights} onChosen={onLights} />
    </ScrollView>
    <Dock>
      <Velvet
        label={nextStepOf(terms)}
        onPress={() => onAsk(terms.area === undefined ? "area" : "movie")}
      />
    </Dock>
  </>
);

export const Search = ({
  seatscout,
  terms,
  profile,
  today,
  clock,
  online,
  lights,
  onLights,
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
  const asked = askedFrom(terms, profile, today);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
      {asked === null ? (
        <Prompt
          lights={lights}
          onAsk={onAsk}
          onLights={onLights}
          onRun={onRun}
          profile={profile}
          programme={programme}
          seatscout={seatscout}
          terms={terms}
          today={today}
        />
      ) : (
        <Results
          asked={asked}
          clock={clock}
          key={keyOf(asked)}
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
