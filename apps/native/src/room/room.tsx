import type { Auditorium, SeatGroupResult } from "@seatscout/client";
import {
  BACK_TO_THE_LIST,
  backToOf,
  type Cursor,
  chosenOf,
  clockOf,
  consolesIn,
  creditsOf,
  dayOf,
  type Frame,
  frameOf,
  groupHolding,
  notBookableIn,
  opened,
  type Place,
  partyOf,
  placed,
  readingOf,
  refusalOf,
  rowOf,
  shownIn,
  UNCONFIRMED,
} from "@seatscout/view-logic";
import { selectionAsync } from "expo-haptics";
import { type ReactElement, useState, useSyncExternalStore } from "react";
import {
  type LayoutRectangle,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Banner } from "../design-system/banner.js";
import { useSpoken } from "../design-system/live.js";
import { SLOP, TOUCH_FLOOR } from "../design-system/touch.js";
import { Type } from "../design-system/type.js";
import type { Clock } from "../host/clock.js";
import { useTheme } from "../theme.js";
import { Alternates } from "./alternates.js";
import { Dock } from "./dock.js";
import { Legend } from "./legend.js";
import type { Drawn } from "./pan-zoom.js";
import { RowBar } from "./row-bar.js";
import { ScreenEdge } from "./screen-edge.js";
import { SeatMap } from "./seat-map.js";

const DRAWN = {
  across: 18,
  map: {
    across: 14,
    inset: 12,
    edge: 1,
    foot: 14,
    top: 8,
    radius: 14,
    tall: 0.52,
  },
  gap: { head: 10, section: 14, line: 4, credit: 5, fact: 16 },
} as const;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingBottom: DRAWN.gap.section },
  back: {
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
    paddingHorizontal: DRAWN.across,
  },
  head: {
    gap: DRAWN.gap.line,
    paddingHorizontal: DRAWN.across,
    paddingTop: DRAWN.gap.head,
  },
  bar: { paddingHorizontal: DRAWN.across, paddingTop: DRAWN.gap.head },
  frame: {
    alignItems: "center",
    borderRadius: DRAWN.map.radius,
    borderWidth: DRAWN.map.edge,
    marginHorizontal: DRAWN.map.across,
    marginTop: DRAWN.gap.head,
    paddingBottom: DRAWN.map.foot,
    paddingHorizontal: DRAWN.map.inset,
    paddingTop: DRAWN.map.top,
  },
  return: {
    alignItems: "center",
    borderRadius: DRAWN.map.radius,
    borderWidth: 1,
    justifyContent: "center",
    marginHorizontal: DRAWN.across,
    marginTop: DRAWN.gap.head,
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
  section: { paddingHorizontal: DRAWN.across, paddingTop: DRAWN.gap.section },
  billing: {
    alignItems: "center",
    gap: DRAWN.gap.credit,
    paddingHorizontal: DRAWN.across,
    paddingTop: DRAWN.gap.section,
  },
  facts: {
    columnGap: DRAWN.gap.fact,
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: DRAWN.across,
    paddingTop: DRAWN.gap.section,
    rowGap: DRAWN.gap.line,
  },
  prov: {
    borderTopWidth: 1,
    gap: DRAWN.gap.line,
    marginTop: DRAWN.gap.section,
    paddingHorizontal: DRAWN.across,
    paddingTop: DRAWN.gap.head,
  },
  centred: { textAlign: "center" },
});

export interface RoomProps {
  readonly auditorium: Auditorium;
  readonly result: SeatGroupResult;
  readonly opening: SeatGroupResult;
  readonly today: string;
  readonly clock: Clock;
  readonly online: boolean;
  readonly onBack: () => void;
  readonly onHandOff: (chosen: SeatGroupResult) => void;
}

const drawnIn = (stage: LayoutRectangle, frame: Frame): Drawn => {
  const width = Math.max(
    0,
    Math.min(
      stage.width - 2 * (DRAWN.map.across + DRAWN.map.inset + DRAWN.map.edge),
      (stage.height * DRAWN.map.tall * frame.width) / frame.height,
    ),
  );
  return { width, height: (width * frame.height) / frame.width };
};

const Billing = ({ group }: { readonly group: SeatGroupResult }) => (
  <View style={styles.billing}>
    <Type set="ledgerLabel" style={styles.centred} tone="silver">
      {rowOf(group.reasons)}
    </Type>
    {creditsOf(group.reasons, group.podDividers).map((credit) => (
      <Type
        key={credit}
        set="ledgerLabel"
        style={styles.centred}
        tone="silverDim"
      >
        {credit}
      </Type>
    ))}
  </View>
);

const Reading = ({
  clock,
  fetchedAt,
}: {
  readonly clock: Clock;
  readonly fetchedAt: number;
}) => {
  const now = useSyncExternalStore(clock.subscribe, clock.now);

  return (
    <Type set="ledgerLabel" tone="silverDim">
      {readingOf(fetchedAt, now)}
    </Type>
  );
};

export const Room = ({
  auditorium,
  result,
  opening,
  today,
  clock,
  online,
  onBack,
  onHandOff,
}: RoomProps): ReactElement => {
  const { colours } = useTheme();
  const [frame] = useState(() => frameOf(auditorium));
  const [stage, setStage] = useState<LayoutRectangle>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [cursor, setCursor] = useState<Cursor>(() => opened(auditorium));
  const [chosen, setChosen] = useState(opening);
  const [notice, setNotice] = useState<string | null>(null);
  const { theater, formats, amenities } = result.showtime.presentation;
  const { partySize, accessibleSeating } = result.terms;
  const drawn = drawnIn(stage, frame);

  useSpoken(notice);

  const choose = (group: SeatGroupResult) => {
    if (group.key !== chosen.key) void selectionAsync();
    setChosen(group);
    setNotice(chosenOf(group));
  };

  const activate = (place: Place) => {
    setCursor(placed(place));
    const group = groupHolding(auditorium, place.seat);
    if (group === undefined)
      setNotice(refusalOf(place.seat, partySize, accessibleSeating));
    else choose(group);
  };

  return (
    <SafeAreaView
      style={[styles.screen, { backgroundColor: colours.house }]}
      testID="stage"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        onLayout={(event) => setStage(event.nativeEvent.layout)}
        testID="scroll"
      >
        <TouchableOpacity
          accessibilityRole="button"
          hitSlop={SLOP}
          onPress={onBack}
          style={styles.back}
        >
          <Type set="sentence" tone="beamDim">
            ‹ {BACK_TO_THE_LIST}
          </Type>
        </TouchableOpacity>
        <View style={styles.head}>
          <Type set="ledgerLabel" tone="silverFaint">
            {[
              partyOf(partySize),
              `${dayOf(result.terms.date, today)} ${clockOf(result.showtime.startsAt)}`,
              ...formats,
            ].join(" · ")}
          </Type>
          <Type set="marqueeTitle" tone="silver">
            {theater.name}
          </Type>
        </View>
        <View style={styles.bar}>
          <RowBar map={auditorium.map} notice={notice} row={cursor.row} />
        </View>
        <View
          style={[
            styles.frame,
            {
              backgroundColor: colours.houseDeep,
              borderColor: colours.hairline,
            },
          ]}
          testID="map-frame"
        >
          <ScreenEdge span={drawn.width} />
          <SeatMap
            accessibleSeating={accessibleSeating}
            auditorium={auditorium}
            chosen={chosen}
            cursor={cursor}
            drawn={drawn}
            frame={frame}
            onActivate={activate}
            result={result}
          />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => {
            setCursor(opened(auditorium));
            setNotice(null);
          }}
          style={[styles.return, { borderColor: colours.hairline }]}
          testID="return"
        >
          <Type set="sentence" tone="silverDim">
            {backToOf(result)}
          </Type>
        </TouchableOpacity>
        <View style={styles.section}>
          <Legend
            accessibleSeating={accessibleSeating}
            chosen={chosen}
            consoles={consolesIn(auditorium.map)}
          />
        </View>
        <Billing group={chosen} />
        <View style={styles.section}>
          <Alternates
            chosen={chosen}
            listed={shownIn(auditorium, result, chosen)}
            offered={auditorium.offered.length}
            onChoose={choose}
            partySize={partySize}
          />
        </View>
        <View style={styles.facts} testID="facts">
          <Type set="ledgerRow" tone="silverDim">
            {notBookableIn(auditorium.map)}
          </Type>
          {amenities.length > 0 && (
            <Type set="ledgerRow" tone="silverDim">
              {amenities.join(" · ")}
            </Type>
          )}
        </View>
        <View
          style={[styles.prov, { borderTopColor: colours.hairline }]}
          testID="provenance"
        >
          <Reading clock={clock} fetchedAt={result.fetchedAt} />
          <Type set="ledgerLabel" tone="velvetLit">
            {UNCONFIRMED}
          </Type>
        </View>
      </ScrollView>
      {!online && <Banner />}
      <Dock chosen={chosen} online={online} onHandOff={onHandOff} />
    </SafeAreaView>
  );
};
