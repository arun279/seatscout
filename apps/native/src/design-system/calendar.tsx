import {
  dayNameOf,
  type Mark,
  monthAfter,
  monthNameOf,
  weekdaysOf,
  weeksOf,
} from "@seatscout/view-logic";
import {
  type MemoExoticComponent,
  memo,
  type ReactElement,
  useMemo,
  useState,
} from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { type Palette, useTheme } from "../theme.js";
import { felt } from "./feedback.js";
import { TOUCH_FLOOR } from "./touch.js";
import { Type } from "./type.js";

export interface CalendarProps {
  readonly today: string;
  readonly opensOn: string;
  readonly firstWeekday: number;
  readonly mark: (date: string) => Mark;
  readonly onDay?: ((date: string) => void) | undefined;
}

interface HeaderProps {
  readonly month: string;
  readonly earliest: string;
  readonly firstWeekday: number;
  readonly onMonth: (month: string) => void;
}

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
  week: { flexDirection: "row", marginVertical: 2 },
  slot: { alignItems: "center", flex: 1 },
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

const Header = memo(
  ({ month, earliest, firstWeekday, onMonth }: HeaderProps) => {
    const first = month <= earliest;
    return (
      <View>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            accessibilityState={{ disabled: first }}
            disabled={first}
            onPress={() => onMonth(monthAfter(month, -1))}
            style={styles.turn}
          >
            <Type set="sentence" tone={first ? "silverFaint" : "silver"}>
              ‹
            </Type>
          </TouchableOpacity>
          <Type accessibilityRole="header" set="sentence" tone="silver">
            {monthNameOf(`${month}-01`)}
          </Type>
          <TouchableOpacity
            accessibilityLabel="Next month"
            accessibilityRole="button"
            onPress={() => onMonth(monthAfter(month, 1))}
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
          {weekdaysOf(firstWeekday).map(([key, weekday]) => (
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
  },
);

interface DayCellProps {
  readonly day: string;
  readonly number: number;
  readonly marked: Mark;
  readonly today: string;
  readonly colours: Palette;
  readonly onDay: ((date: string) => void) | undefined;
}

const toneOf = (marked: Mark, past: boolean): keyof Palette => {
  if (marked !== "none") return "onChosen";
  return past ? "silverFaint" : "silver";
};

const DayCell = memo(
  ({ day, number, marked, today, colours, onDay }: DayCellProps) => {
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
  },
);

interface WeekProps {
  readonly week: readonly (string | null)[];
  readonly today: string;
  readonly colours: Palette;
  readonly mark: (date: string) => Mark;
  readonly onDay: ((date: string) => void) | undefined;
}

const Week = ({ week, today, colours, mark, onDay }: WeekProps) => {
  const days = week.filter((day) => day !== null);
  const before = week.indexOf(days[0] ?? null);
  const after = week.length - before - days.length;
  return (
    <View style={styles.week}>
      {before > 0 && <View style={{ flex: before }} />}
      {days.map((day) => (
        <View key={day} style={styles.slot}>
          <DayCell
            colours={colours}
            day={day}
            marked={mark(day)}
            number={Number(day.slice(8))}
            onDay={onDay}
            today={today}
          />
        </View>
      ))}
      {after > 0 && <View style={{ flex: after }} />}
    </View>
  );
};

export const Calendar: MemoExoticComponent<
  (props: CalendarProps) => ReactElement
> = memo(
  ({
    today,
    opensOn,
    firstWeekday,
    mark,
    onDay,
  }: CalendarProps): ReactElement => {
    const { colours } = useTheme();
    const [month, setMonth] = useState(opensOn.slice(0, 7));
    const weeks = useMemo(
      () => weeksOf(month, firstWeekday).filter((week) => week.some(Boolean)),
      [month, firstWeekday],
    );

    return (
      <View>
        <Header
          earliest={today.slice(0, 7)}
          firstWeekday={firstWeekday}
          month={month}
          onMonth={setMonth}
        />
        {weeks.map((week) => (
          <Week
            colours={colours}
            key={week.find(Boolean) ?? month}
            mark={mark}
            onDay={onDay}
            today={today}
            week={week}
          />
        ))}
      </View>
    );
  },
);
