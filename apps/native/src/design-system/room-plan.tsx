import { REFERENCE, type SeatGroupResult } from "@seatscout/client";
import { marksOf } from "@seatscout/view-logic";
import type { ReactElement } from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Defs,
  FeDropShadow,
  Filter,
  Line,
} from "react-native-svg";
import { useTheme } from "../theme.js";

const DRAWN = {
  across: 64,
  down: 46,
  screen: { from: 14, to: 50, at: 2.5, width: 2, cap: "round" },
  row: { width: 1.6, cap: "round" },
  target: { radius: 4.5, width: 1, dashes: "2 2.5", fill: "none" },
  pair: { radius: 3, spread: 1.75, lit: 0.9, lamp: "url(#lit)", unlit: "" },
} as const;

export interface RoomPlanProps {
  readonly result: SeatGroupResult;
  readonly across: number;
}

export const RoomPlan = ({ result, across }: RoomPlanProps): ReactElement => {
  const { appearance, colours } = useTheme();
  const marks = marksOf(
    result.plan,
    result.position,
    result.terms.profile ?? REFERENCE,
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        height={(across * DRAWN.down) / DRAWN.across}
        testID="plan"
        viewBox={`0 0 ${DRAWN.across} ${DRAWN.down}`}
        width={across}
      >
        <Defs>
          <Filter
            filterUnits="userSpaceOnUse"
            height={DRAWN.down}
            id="lit"
            width={DRAWN.across}
            x={0}
            y={0}
          >
            <FeDropShadow
              dx={0}
              dy={0}
              floodColor={colours.beam}
              floodOpacity={DRAWN.pair.lit}
              stdDeviation={DRAWN.pair.spread}
            />
          </Filter>
        </Defs>
        <Line
          stroke={colours.beam}
          strokeLinecap={DRAWN.screen.cap}
          strokeWidth={DRAWN.screen.width}
          testID="screen-line"
          x1={DRAWN.screen.from}
          x2={DRAWN.screen.to}
          y1={DRAWN.screen.at}
          y2={DRAWN.screen.at}
        />
        {marks.rows.map((row) => (
          <Line
            key={`${row.y}:${row.x1}`}
            stroke={colours.seatGone}
            strokeLinecap={DRAWN.row.cap}
            strokeWidth={DRAWN.row.width}
            testID="row-line"
            x1={row.x1}
            x2={row.x2}
            y1={row.y}
            y2={row.y}
          />
        ))}
        <Circle
          cx={marks.target.cx}
          cy={marks.target.cy}
          fill={DRAWN.target.fill}
          r={DRAWN.target.radius}
          stroke={colours.silverFaint}
          strokeDasharray={DRAWN.target.dashes}
          strokeWidth={DRAWN.target.width}
          testID="target"
        />
        <Circle
          cx={marks.pair.cx}
          cy={marks.pair.cy}
          fill={colours.beam}
          filter={appearance === "down" ? DRAWN.pair.lamp : DRAWN.pair.unlit}
          r={DRAWN.pair.radius}
          testID="pair"
        />
      </Svg>
    </View>
  );
};
