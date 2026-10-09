import { type ReactElement, useSyncExternalStore } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenBand } from "../design-system/screen-band.js";
import type { Session } from "../host/session.js";
import { Strip } from "../search/coverage.js";
import { useTheme } from "../theme.js";

const styles = StyleSheet.create({ screen: { flex: 1 } });

export const Unopened = ({
  session,
  today,
  onLedger,
}: {
  readonly session: Session;
  readonly today: string;
  readonly onLedger: () => void;
}): ReactElement => {
  const { colours } = useTheme();

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colours.house }]}
      testID="stage"
    >
      <ScreenBand />
      <Strip
        onLedger={onLedger}
        onReadMore={session.search.readMore}
        snapshot={useSyncExternalStore(
          session.held.subscribe,
          session.held.snapshot,
        )}
        today={today}
      />
    </SafeAreaView>
  );
};
