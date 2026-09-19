import type {
  Search,
  SearchTerms,
  SeatGroupResult,
  SeatProfile,
  SeatScout,
  Snapshot,
} from "@seatscout/client";
import {
  BELOW_THE_TIE,
  headOf,
  type HeldSnapshots,
  heldSnapshots,
  listed,
  type ProgrammeState,
  type Term,
  type Terms,
  tiedIn,
  tiedOf,
  unreachedIn,
  whenOf,
} from "@seatscout/view-logic";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ScreenBand } from "../design-system/screen-band.js";
import { Type } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { useTheme } from "../theme.js";
import { Card } from "./card.js";
import { Strip } from "./coverage.js";
import { TitleCard } from "./title-card.js";
import { Empty, Partial, Unreachable } from "./verdicts.js";

export interface ResultsProps {
  readonly seatscout: SeatScout;
  readonly asked: SearchTerms;
  readonly terms: Terms;
  readonly programme: ProgrammeState;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly onEdit: (term: Term) => void;
  readonly onRoom: (result: SeatGroupResult) => void;
  readonly onHandOff: (result: SeatGroupResult) => void;
  readonly onLedger: () => void;
}

interface Session {
  readonly search: Search;
  readonly held: HeldSnapshots;
}

const styles = StyleSheet.create({
  list: { gap: 8, paddingBottom: 18 },
  screen: { flex: 1 },
  head: {
    alignItems: "baseline",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingBottom: 2,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  tie: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 8,
    paddingBottom: 6,
    paddingTop: 10,
  },
  beam: { flex: 1, height: 1.5 },
});

const opened = (seatscout: SeatScout, asked: SearchTerms): Session => {
  const search = seatscout.search(asked);
  return { search, held: heldSnapshots(search) };
};

const Head = ({
  snapshot,
  tie,
}: {
  readonly snapshot: Snapshot;
  readonly tie: boolean;
}) => {
  const head = headOf(snapshot, tie);

  return (
    <View style={styles.head} testID="list-head">
      <Type accessibilityRole="header" set="ledgerLabel" tone="silverFaint">
        {head.said}
      </Type>
      {head.count !== null && (
        <Type set="ledgerLabel" tone="silverFaint">
          {head.count}
        </Type>
      )}
    </View>
  );
};

const TieRule = ({ tied }: { readonly tied: number }) => {
  const theme = useTheme();

  return (
    <View style={styles.tie} testID="tie-rule">
      <Type set="ledgerTag" tone="beamDim">
        {tiedOf(tied)}
      </Type>
      <View style={[styles.beam, { backgroundColor: theme.colours.beamDim }]} />
      <Type set="ledgerTag" tone="beamDim">
        {BELOW_THE_TIE}
      </Type>
    </View>
  );
};

export const Results = ({
  seatscout,
  asked,
  terms,
  programme,
  profile,
  today,
  clock,
  online,
  onEdit,
  onRoom,
  onHandOff,
  onLedger,
}: ResultsProps): ReactElement => {
  const [session] = useState(() => opened(seatscout, asked));
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );
  const painted = useSyncExternalStore(
    session.held.subscribe,
    session.held.painted,
  );
  const when = whenOf(terms.date, today);
  const settled = snapshot.phase === "settled";
  const results = painted === null ? [] : listed(painted.results);
  const tied = tiedIn(results);
  const tie = tied > 1;
  const partial = settled && unreachedIn(snapshot) > 0;
  const retry = () => {
    void session.search.retry();
  };

  const verdict =
    snapshot.phase === "unreachable" ? (
      <Unreachable
        onEdit={onEdit}
        online={online}
        onRetry={retry}
        when={when}
      />
    ) : (
      <>
        {partial && (
          <Partial
            onEdit={onEdit}
            online={online}
            onRetry={retry}
            snapshot={snapshot}
          />
        )}
        {settled && !partial && results.length === 0 ? (
          <Empty
            onEdit={onEdit}
            snapshot={snapshot}
            terms={terms}
            when={when}
          />
        ) : (
          <Head snapshot={snapshot} tie={tie} />
        )}
      </>
    );

  return (
    <FlatList
      ListHeaderComponent={
        <>
          <ScreenBand />
          <TitleCard
            onEdit={onEdit}
            profile={profile}
            programme={programme}
            terms={terms}
            today={today}
          />
          <Strip onLedger={onLedger} snapshot={snapshot} />
          {verdict}
        </>
      }
      contentContainerStyle={styles.list}
      data={results}
      keyExtractor={(result) => result.key}
      onTouchCancel={session.held.release}
      onTouchEnd={session.held.release}
      onTouchStart={session.held.hold}
      renderItem={({ item, index }) => (
        <>
          {tie && index === tied && <TieRule tied={tied} />}
          <Card
            clock={clock}
            onHandOff={onHandOff}
            online={online}
            onRoom={onRoom}
            result={item}
          />
        </>
      )}
      style={styles.screen}
      testID="list"
    />
  );
};
