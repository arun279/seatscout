import {
  type ReactElement,
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AccessibilityInfo,
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../theme.js";
import { ON_ANDROID } from "./platform.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface SheetProps {
  readonly heading: string;
  readonly keep: string;
  readonly onKeep: () => void;
  readonly claimed: boolean;
  readonly scrolls?: boolean;
  readonly dock: ReactNode;
  readonly children: ReactNode;
}

export const presentationFor = (
  os: typeof Platform.OS,
): "formSheet" | "fullScreenModal" =>
  os === "android" ? "fullScreenModal" : "formSheet";

export const SHEET_PRESENTATION: "formSheet" | "fullScreenModal" =
  presentationFor(Platform.OS);

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  head: { gap: 3, paddingBottom: 6, paddingHorizontal: 18, paddingTop: 10 },
  keep: {
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
  bar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minHeight: 64,
    paddingRight: 6,
  },
  close: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 48,
  },
  body: { flex: 1 },
  read: { paddingBottom: 18 },
  dock: {
    borderTopWidth: 1,
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
});

const keyboardLift = () => {
  let lift = 0;

  return {
    snapshot: () => lift,
    subscribe: (changed: () => void) => {
      const follow = ({ duration }: KeyboardEvent, to: number) => {
        if (duration > 0)
          LayoutAnimation.configureNext({
            duration,
            update: { duration, type: "keyboard" },
          });
        lift = to;
        changed();
      };
      const subscriptions = ON_ANDROID
        ? []
        : [
            Keyboard.addListener("keyboardWillShow", (event) =>
              follow(event, event.endCoordinates.height),
            ),
            Keyboard.addListener("keyboardWillHide", (event) =>
              follow(event, 0),
            ),
          ];
      return () => {
        for (const subscription of subscriptions) subscription.remove();
      };
    },
  };
};

type HeadProps = Pick<SheetProps, "heading" | "keep" | "onKeep">;

const AppBar = ({ heading, keep, onKeep }: HeadProps) => (
  <View style={styles.bar}>
    <TouchableOpacity
      accessibilityLabel={keep}
      accessibilityRole="button"
      onPress={onKeep}
      style={styles.close}
    >
      <Type set="sentenceStrong" tone="silver">
        ✕
      </Type>
    </TouchableOpacity>
    <Type accessibilityRole="header" set="marqueeRow" tone="silver">
      {heading}
    </Type>
  </View>
);

const Head = ({ heading, keep, onKeep }: HeadProps) => (
  <View style={styles.head}>
    <TouchableOpacity
      accessibilityLabel={keep}
      accessibilityRole="button"
      onPress={onKeep}
      style={styles.keep}
    >
      <Type set="sentence" tone="beam">
        {`‹ ${keep}`}
      </Type>
    </TouchableOpacity>
    <Type accessibilityRole="header" set="marqueeTitle" tone="silver">
      {heading}
    </Type>
  </View>
);

export const Sheet = ({
  heading,
  keep,
  onKeep,
  claimed,
  scrolls = true,
  dock,
  children,
}: SheetProps): ReactElement => {
  const theme = useTheme();
  const above: HeadProps = { heading, keep, onKeep };
  const [keyboard] = useState(keyboardLift);
  const lift = useSyncExternalStore(keyboard.subscribe, keyboard.snapshot);

  useEffect(() => {
    if (!claimed) AccessibilityInfo.announceForAccessibility(heading);
  }, [claimed, heading]);

  return (
    <View
      style={[
        styles.sheet,
        { backgroundColor: theme.colours.house, paddingBottom: lift },
      ]}
      testID="stage"
    >
      {ON_ANDROID ? (
        <SafeAreaView
          edges={["top"]}
          style={{ backgroundColor: theme.colours.chrome }}
          testID="sheet-head"
        >
          <AppBar {...above} />
        </SafeAreaView>
      ) : (
        <View testID="sheet-head">
          <Head {...above} />
        </View>
      )}
      <View collapsable={false} style={styles.body} testID="sheet-body">
        <ScrollView
          contentContainerStyle={styles.read}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={scrolls}
          testID="sheet-scroll"
        >
          {children}
        </ScrollView>
      </View>
      <SafeAreaView
        edges={["bottom"]}
        style={[
          styles.dock,
          {
            backgroundColor: theme.colours.house,
            borderTopColor: theme.colours.hairline,
          },
        ]}
        testID="dock"
      >
        {dock}
      </SafeAreaView>
    </View>
  );
};
