import type { Snapshot } from "@seatscout/client";
import {
  AMONG_THE_UNREAD,
  BACK_TO_THE_LIST,
  GONE_FROM_THE_LISTING,
  NOT_IN_THE_LISTING,
  NOT_READ_SO_FAR,
  OPENING_THIS_SHOWTIME,
  RETRY_THE_SEARCH,
  readMoreOf,
  UNREADABLE,
} from "@seatscout/view-logic";
import { type ReactElement, useSyncExternalStore } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Velvet } from "../design-system/button.js";
import { Type } from "../design-system/type.js";
import type { Session } from "../host/session.js";
import { Strip } from "../search/coverage.js";
import { useTheme } from "../theme.js";
import { Back } from "./back.js";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  verdict: { gap: 11, paddingHorizontal: 18, paddingTop: 16 },
});

const Heading = ({ said }: { readonly said: string }) => (
  <Type accessibilityRole="header" set="marqueeVerdict" tone="silver">
    {said}
  </Type>
);

const Told = ({
  said,
  why,
}: {
  readonly said: string;
  readonly why: string;
}) => (
  <>
    <Heading said={said} />
    <Type set="sentence" tone="silverDim">
      {why}
    </Type>
  </>
);

const Verdict = ({
  snapshot,
  today,
  onRetry,
  onBack,
}: {
  readonly snapshot: Snapshot;
  readonly today: string;
  readonly onRetry: () => void;
  readonly onBack: () => void;
}) => {
  if (snapshot.phase === "unreachable")
    return (
      <>
        <Heading said={UNREADABLE} />
        <Velvet label={RETRY_THE_SEARCH} onPress={onRetry} />
      </>
    );
  if (readMoreOf(snapshot, today) !== null)
    return <Told said={NOT_READ_SO_FAR} why={AMONG_THE_UNREAD} />;
  if (snapshot.phase === "settled")
    return (
      <>
        <Told said={NOT_IN_THE_LISTING} why={GONE_FROM_THE_LISTING} />
        <Velvet label={BACK_TO_THE_LIST} onPress={onBack} />
      </>
    );
  return <Heading said={OPENING_THIS_SHOWTIME} />;
};

export const Unopened = ({
  session,
  today,
  onLedger,
  onBack,
}: {
  readonly session: Session;
  readonly today: string;
  readonly onLedger: () => void;
  readonly onBack: () => void;
}): ReactElement => {
  const { colours } = useTheme();
  const snapshot = useSyncExternalStore(
    session.held.subscribe,
    session.held.snapshot,
  );

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colours.house }]}
      testID="stage"
    >
      <Back onBack={onBack} />
      <Strip
        onLedger={onLedger}
        onReadMore={session.search.readMore}
        snapshot={snapshot}
        today={today}
      />
      <View style={styles.verdict}>
        <Verdict
          onBack={onBack}
          onRetry={session.search.retry}
          snapshot={snapshot}
          today={today}
        />
      </View>
    </SafeAreaView>
  );
};
