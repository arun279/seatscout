import type {
  Auditorium,
  PositionedSeat,
  SeatGroupResult,
  SeatRow,
} from "@seatscout/client";
import {
  aimedAt,
  type Cursor,
  dividersIn,
  type Frame,
  holds,
  mapLabelOf,
  type Place,
  placed,
  seatNameOf,
} from "@seatscout/view-logic";
import type { ReactElement, ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  FeDropShadow,
  Filter,
  G,
  Line,
  Rect,
  type RectProps,
  Text as SvgText,
} from "react-native-svg";
import { type Palette, type Theme, useTheme } from "../theme.js";
import { type Drawn, usePanZoom } from "./pan-zoom.js";

const DRAWN = {
  seat: { radius: 0.25, glow: 5, lit: 0.95 },
  gone: { stroke: 1.1 },
  space: { stroke: 1.4, dashes: [2.2, 1.6] },
  tick: { stroke: 1.2 },
  aim: { radius: 1.4, stroke: 1, dashes: [3, 3] },
  label: { inset: 1.2, size: 0.7 },
  id: { size: 0.42 },
} as const;

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
  spoken: { height: 0 },
});

interface SeatMapProps {
  readonly auditorium: Auditorium;
  readonly result: SeatGroupResult;
  readonly chosen: SeatGroupResult;
  readonly cursor: Cursor;
  readonly accessibleSeating: boolean;
  readonly frame: Frame;
  readonly drawn: Drawn;
  readonly onActivate: (place: Place) => void;
}

type Ink = Pick<
  RectProps,
  "fill" | "stroke" | "strokeWidth" | "strokeDasharray"
>;

const filledWith = (
  seat: PositionedSeat,
  lit: boolean,
  colours: Palette,
): string => {
  if (lit) return colours.beam;
  return seat.bookable && seat.designation === "standard"
    ? colours.seatFree
    : "none";
};

const inkFor = (seat: PositionedSeat, lit: boolean, colours: Palette): Ink => {
  const fill = filledWith(seat, lit, colours);
  if (seat.designation !== "standard")
    return {
      fill,
      stroke: seat.bookable ? colours.beamDim : colours.seatGone,
      strokeWidth: DRAWN.space.stroke,
      strokeDasharray: [...DRAWN.space.dashes],
    };
  return seat.bookable || lit
    ? { fill }
    : { fill, stroke: colours.seatGone, strokeWidth: DRAWN.gone.stroke };
};

const Seat = ({
  seat,
  lit,
  ringed,
  name,
  theme,
  onPress,
}: {
  readonly seat: PositionedSeat;
  readonly lit: boolean;
  readonly ringed: boolean;
  readonly name: string;
  readonly theme: Theme;
  readonly onPress: () => void;
}) => (
  <Rect
    accessibilityLabel={name}
    accessible
    height={seat.height}
    onPress={onPress}
    rx={seat.width * DRAWN.seat.radius}
    vectorEffect="non-scaling-stroke"
    width={seat.width}
    x={seat.x}
    y={seat.y}
    {...inkFor(seat, lit, theme.colours)}
    {...(ringed && {
      stroke: theme.colours.beamDim,
      strokeWidth: DRAWN.space.stroke,
    })}
    {...(lit && theme.appearance === "down" && { filter: "url(#lit)" })}
  />
);

const Row = ({
  row,
  frame,
  theme,
  children,
}: {
  readonly row: SeatRow;
  readonly frame: Frame;
  readonly theme: Theme;
  readonly children: ReactNode;
}) => (
  <G>
    {row.label !== null && (
      <SvgText
        alignmentBaseline="central"
        fill={theme.colours.silverFaint}
        fontFamily={theme.type.ledgerRow.family}
        fontSize={DRAWN.label.size * frame.seatWidth}
        testID="row-label"
        textAnchor="middle"
        x={frame.x + DRAWN.label.inset * frame.seatWidth}
        y={
          Math.min(...row.seats.map((seat) => seat.y)) +
          Math.max(...row.seats.map((seat) => seat.height)) / 2
        }
      >
        {row.label}
      </SvgText>
    )}
    {dividersIn(row).map((divider) => (
      <Line
        key={divider.x}
        stroke={theme.colours.seatTick}
        strokeWidth={DRAWN.tick.stroke}
        testID="tick"
        vectorEffect="non-scaling-stroke"
        x1={divider.x}
        x2={divider.x}
        y1={divider.y1}
        y2={divider.y2}
      />
    ))}
    {children}
  </G>
);

const AnimatedG = Animated.createAnimatedComponent(G);

export const SeatMap = ({
  auditorium,
  result,
  chosen,
  cursor,
  accessibleSeating,
  frame,
  drawn,
  onActivate,
}: SeatMapProps): ReactElement => {
  const theme = useTheme();
  const { gesture, drawing, labels } = usePanZoom(frame, drawn, cursor);
  const recommended = result.seats.map((seat) => seat.id);
  const aim = aimedAt(chosen, auditorium.map);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.frame, drawn]} testID="seat-map">
        <View
          accessibilityLabel={mapLabelOf(auditorium, result)}
          accessibilityRole="summary"
          accessible
          style={styles.spoken}
        />
        <Svg
          height={drawn.height}
          testID="plan"
          viewBox={`0 0 ${frame.width} ${frame.height}`}
          width={drawn.width}
        >
          <Defs>
            <Filter id="lit">
              <FeDropShadow
                dx={0}
                dy={0}
                floodColor={theme.colours.beam}
                floodOpacity={DRAWN.seat.lit}
                stdDeviation={DRAWN.seat.glow}
              />
            </Filter>
          </Defs>
          <AnimatedG animatedProps={drawing} testID="drawing">
            <G testID="room" x={-frame.x} y={-frame.y}>
              <Circle
                cx={aim.x + aim.width / 2}
                cy={aim.y + aim.height / 2}
                fill="none"
                r={DRAWN.aim.radius * frame.seatWidth}
                stroke={theme.colours.silverFaint}
                strokeDasharray={[...DRAWN.aim.dashes]}
                strokeWidth={DRAWN.aim.stroke}
                testID="aim"
                vectorEffect="non-scaling-stroke"
              />
              {auditorium.map.rows.map((row) => (
                <Row
                  key={row.ordinalFromFront}
                  frame={frame}
                  row={row}
                  theme={theme}
                >
                  {row.seats.map((held) => (
                    <Seat
                      key={held.id}
                      lit={holds(chosen, held)}
                      name={seatNameOf(held, recommended, accessibleSeating)}
                      onPress={() => onActivate(placed({ row, seat: held }))}
                      ringed={holds(result, held) && !holds(chosen, held)}
                      seat={held}
                      theme={theme}
                    />
                  ))}
                </Row>
              ))}
              <AnimatedG animatedProps={labels} testID="ids">
                {chosen.seats.map((held) => (
                  <SvgText
                    key={held.id}
                    alignmentBaseline="central"
                    fill={theme.colours.houseDeep}
                    fontFamily={theme.type.ledgerRow.family}
                    fontSize={DRAWN.id.size * held.width}
                    testID="seat-id"
                    textAnchor="middle"
                    x={held.x + held.width / 2}
                    y={held.y + held.height / 2}
                  >
                    {held.id}
                  </SvgText>
                ))}
              </AnimatedG>
            </G>
          </AnimatedG>
        </Svg>
      </View>
    </GestureDetector>
  );
};
