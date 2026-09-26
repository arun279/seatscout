import { dayNameOf, type Mark, monthNameOf } from "@seatscout/view-logic";
import { createContext, type ReactElement, useContext } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Calendar as MonthGrid, type DateData } from "react-native-calendars";
import { type Palette, useTheme } from "../theme.js";
import { felt } from "./feedback.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface CalendarProps {
  readonly today: string;
  readonly opensOn: string;
  readonly mark: (date: string) => Mark;
  readonly onDay?: ((date: string) => void) | undefined;
}

interface HeaderProps {
  readonly month: { readonly toString: (format: string) => string };
  readonly addMonth: (count: number) => void;
}

const WEEKDAYS = [
  ["sun", "S"],
  ["mon", "M"],
  ["tue", "T"],
  ["wed", "W"],
  ["thu", "T"],
  ["fri", "F"],
  ["sat", "S"],
] as const;

const SIDE = 4;

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  turn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR,
  },
  weekdays: { flexDirection: "row", paddingBottom: 4, paddingTop: 6 },
  weekday: { flex: 1, textAlign: "center" },
  day: {
    alignItems: "center",
    borderRadius: TOUCH_FLOOR / 2,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: TOUCH_FLOOR,
    minWidth: TOUCH_FLOOR - 2 * SIDE,
  },
});

const SLOP = { top: 0, bottom: 0, left: SIDE, right: SIDE };

const Header = ({
  month,
  addMonth,
  today,
}: HeaderProps & { readonly today: string }) => {
  const shown = month.toString("yyyy-MM-01");
  const earliest = `${today.slice(0, 7)}-01`;
  return (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Previous month"
          accessibilityRole="button"
          accessibilityState={{ disabled: shown <= earliest }}
          disabled={shown <= earliest}
          onPress={() => addMonth(-1)}
          style={styles.turn}
        >
          <Type
            set="sentence"
            tone={shown <= earliest ? "silverFaint" : "silver"}
          >
            ‹
          </Type>
        </TouchableOpacity>
        <Type accessibilityRole="header" set="sentence" tone="silver">
          {monthNameOf(shown)}
        </Type>
        <TouchableOpacity
          accessibilityLabel="Next month"
          accessibilityRole="button"
          onPress={() => addMonth(1)}
          style={styles.turn}
        >
          <Type set="sentence" tone="silver">
            ›
          </Type>
        </TouchableOpacity>
      </View>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={styles.weekdays}
      >
        {WEEKDAYS.map(([key, weekday]) => (
          <Type
            key={key}
            set="ledgerLabel"
            style={styles.weekday}
            tone="silverFaint"
          >
            {weekday}
          </Type>
        ))}
      </View>
    </View>
  );
};

interface DayCellProps {
  readonly day: string;
  readonly number: number | undefined;
  readonly marked: Mark;
  readonly today: string;
  readonly colours: Palette;
  readonly onDay: ((date: string) => void) | undefined;
}

const toneOf = (marked: Mark, past: boolean): keyof Palette => {
  if (marked !== "none") return "onChosen";
  return past ? "silverFaint" : "silver";
};

const DayCell = ({
  day,
  number,
  marked,
  today,
  colours,
  onDay,
}: DayCellProps) => {
  const past = day < today;
  const fill = {
    none: undefined,
    picked: colours.chosen,
    between: colours.beam,
  }[marked];
  const edge = day === today && marked === "none" ? colours.beam : fill;
  const drawn = [
    styles.day,
    { backgroundColor: fill, borderColor: edge ?? colours.house },
  ];
  const said = (
    <Type set="sentence" tone={toneOf(marked, past)}>
      {number}
    </Type>
  );
  return past || onDay === undefined ? (
    <View
      accessibilityLabel={dayNameOf(day, today)}
      accessibilityState={{ disabled: true }}
      accessible
      style={drawn}
    >
      {said}
    </View>
  ) : (
    <TouchableOpacity
      accessibilityLabel={dayNameOf(day, today)}
      accessibilityRole="button"
      accessibilityState={{ selected: marked !== "none" }}
      hitSlop={SLOP}
      onPress={felt(() => onDay(day))}
      style={drawn}
    >
      {said}
    </TouchableOpacity>
  );
};

const Chosen = createContext<Pick<CalendarProps, "mark" | "onDay" | "today">>({
  mark: () => "none",
  onDay: undefined,
  today: "",
});

const Day = ({ date }: { readonly date?: DateData }) => {
  const { mark, onDay, today } = useContext(Chosen);
  const { colours } = useTheme();
  const day = date?.dateString ?? today;
  return (
    <DayCell
      colours={colours}
      day={day}
      marked={mark(day)}
      number={date?.day}
      onDay={onDay}
      today={today}
    />
  );
};

export const Calendar = ({
  today,
  opensOn,
  mark,
  onDay,
}: CalendarProps): ReactElement => {
  const { colours } = useTheme();

  return (
    <Chosen.Provider value={{ mark, onDay, today }}>
      <MonthGrid
        current={opensOn}
        customHeader={(props: HeaderProps) => (
          <Header {...props} today={today} />
        )}
        dayComponent={Day}
        hideExtraDays
        theme={{ calendarBackground: colours.house, weekVerticalMargin: 2 }}
      />
    </Chosen.Provider>
  );
};
