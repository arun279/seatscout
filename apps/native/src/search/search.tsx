import type { SeatProfile, SeatScout } from "@seatscout/client";
import type { Term, Terms } from "@seatscout/view-logic";
import { FIND_SEATS, ledeOf, programmeNear } from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Velvet } from "../design-system/button.js";
import { Type } from "../design-system/type.js";
import { useRemembered } from "../host/remembered.js";
import { useTheme } from "../theme.js";
import { Recent } from "./recent.js";
import { ScreenBand } from "../design-system/screen-band.js";
import { TitleCard } from "./title-card.js";

export interface SearchProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly onAsk: (term: Term) => void;
  readonly onRun: (terms: Terms) => void;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  lede: { paddingHorizontal: 18, paddingTop: 18 },
  commit: { paddingHorizontal: 18, paddingTop: 16 },
});

export const Search = ({
  seatscout,
  terms,
  profile,
  today,
  onAsk,
  onRun,
}: SearchProps): ReactElement => {
  const theme = useTheme();
  const [playing] = useState(() =>
    programmeNear(seatscout, terms.area, terms.date),
  );
  const programme = useSyncExternalStore(playing.subscribe, playing.snapshot);
  const remembered = useRemembered(seatscout);

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: theme.colours.house }]}
      testID="stage"
    >
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
    </SafeAreaView>
  );
};
