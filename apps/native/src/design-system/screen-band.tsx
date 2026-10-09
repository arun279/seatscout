import { type ReactElement, useId } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import Svg, {
  Defs,
  FeDropShadow,
  Filter,
  LinearGradient,
  Polygon,
  Rect,
  Stop,
} from "react-native-svg";
import { type Palette, useTheme } from "../theme.js";
import { Type } from "./type.js";

type Tone = Extract<keyof Palette, "beamDim" | "silver">;

interface Fall {
  readonly inset: number;
  readonly taper: number;
  readonly top: number;
  readonly lit: number;
}

export interface ScreenDrawing {
  readonly word: string;
  readonly band: ViewStyle;
  readonly reach: number;
  readonly edge: {
    readonly across: number;
    readonly top: number;
    readonly height: number;
    readonly radius: number;
  };
  readonly unlit: { readonly height: number; readonly radius: number };
  readonly across: readonly {
    readonly at: number;
    readonly tone: Tone;
    readonly lit: number;
  }[];
  readonly glows: readonly {
    readonly dy: number;
    readonly spread: number;
    readonly lit: number;
  }[];
  readonly fall?: Fall;
}

const OVER_THE_LIST: ScreenDrawing = {
  word: "Seatscout",
  band: { paddingBottom: 13, paddingTop: 24 },
  reach: 135,
  edge: { across: 0.62, top: 12, height: 3, radius: 2 },
  unlit: { height: 4, radius: 1 },
  across: [
    { at: 0, tone: "beamDim", lit: 0 },
    { at: 0.12, tone: "beamDim", lit: 1 },
    { at: 0.5, tone: "silver", lit: 1 },
    { at: 0.88, tone: "beamDim", lit: 1 },
    { at: 1, tone: "beamDim", lit: 0 },
  ],
  glows: [
    { dy: 2, spread: 9, lit: 0.5 },
    { dy: 8, spread: 22, lit: 0.25 },
  ],
  fall: { inset: 0.08, taper: 0.084, top: 15, lit: 0.1 },
};

export const OVER_THE_MAP: ScreenDrawing = {
  word: "Screen",
  band: { height: 22, paddingTop: 10 },
  reach: 22,
  edge: { across: 0.84, top: 4, height: 2.5, radius: 2 },
  unlit: { height: 3, radius: 2 },
  across: [
    { at: 0, tone: "beamDim", lit: 0 },
    { at: 0.1, tone: "beamDim", lit: 1 },
    { at: 0.5, tone: "silver", lit: 1 },
    { at: 0.9, tone: "beamDim", lit: 1 },
    { at: 1, tone: "beamDim", lit: 0 },
  ],
  glows: [{ dy: 2, spread: 7, lit: 0.55 }],
};

const styles = StyleSheet.create({
  band: { alignItems: "center" },
  drawing: { left: 0, position: "absolute", top: 0 },
  unlit: { opacity: 0.9, position: "absolute" },
});

const edgeOn = (drawing: ScreenDrawing, span: number) => ({
  width: span * drawing.edge.across,
  left: (span * (1 - drawing.edge.across)) / 2,
});

const coneOn = (fall: Fall, span: number, reach: number) => {
  const left = span * fall.inset;
  const right = span - left;
  const taper = span * fall.taper;
  return [
    [left + taper, fall.top],
    [right - taper, fall.top],
    [right, reach],
    [left, reach],
  ]
    .map((corner) => corner.join(","))
    .join(" ");
};

interface Lighting {
  readonly drawing: ScreenDrawing;
  readonly span: number;
  readonly colours: Palette;
}

const Beam = ({
  fall,
  span,
  reach,
  colours,
}: {
  readonly fall: Fall;
  readonly span: number;
  readonly reach: number;
  readonly colours: Palette;
}) => {
  const id = useId();

  return (
    <>
      <Defs>
        <LinearGradient id={`${id}-fall`} x1="0" x2="0" y1="0" y2="1">
          <Stop offset={0} stopColor={colours.beam} stopOpacity={fall.lit} />
          <Stop offset={1} stopColor={colours.beam} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Polygon
        fill={`url(#${id}-fall)`}
        points={coneOn(fall, span, reach)}
        testID="beam"
      />
    </>
  );
};

const Lit = ({ drawing, span, colours }: Lighting) => {
  const edge = edgeOn(drawing, span);
  const id = useId();

  return (
    <Svg
      height={drawing.reach}
      pointerEvents="none"
      style={styles.drawing}
      testID="lights"
      width={span}
    >
      <Defs>
        <LinearGradient id={`${id}-edge`} x1="0" x2="1" y1="0" y2="0">
          {drawing.across.map((stop) => (
            <Stop
              key={stop.at}
              offset={stop.at}
              stopColor={colours[stop.tone]}
              stopOpacity={stop.lit}
            />
          ))}
        </LinearGradient>
        <Filter
          filterUnits="userSpaceOnUse"
          height={drawing.reach}
          id={`${id}-glow`}
          width={span}
          x={0}
          y={0}
        >
          {drawing.glows.map((glow) => (
            <FeDropShadow
              dx={0}
              dy={glow.dy}
              floodColor={colours.beam}
              floodOpacity={glow.lit}
              key={glow.spread}
              stdDeviation={glow.spread}
            />
          ))}
        </Filter>
      </Defs>
      {drawing.fall !== undefined && (
        <Beam
          colours={colours}
          fall={drawing.fall}
          reach={drawing.reach}
          span={span}
        />
      )}
      <Rect
        fill={`url(#${id}-edge)`}
        filter={`url(#${id}-glow)`}
        height={drawing.edge.height}
        rx={drawing.edge.radius}
        testID="screen"
        width={edge.width}
        x={edge.left}
        y={drawing.edge.top}
      />
    </Svg>
  );
};

export const ScreenBand = ({
  drawing = OVER_THE_LIST,
  span,
}: {
  readonly drawing?: ScreenDrawing;
  readonly span?: number;
}): ReactElement => {
  const { appearance, colours } = useTheme();
  const { width } = useWindowDimensions();
  const band = span ?? width;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.band, drawing.band, { width: span }]}
      testID="screen-band"
    >
      {appearance === "down" ? (
        <Lit colours={colours} drawing={drawing} span={band} />
      ) : (
        <View
          style={[
            styles.unlit,
            edgeOn(drawing, band),
            {
              backgroundColor: colours.beam,
              borderRadius: drawing.unlit.radius,
              height: drawing.unlit.height,
              top: drawing.edge.top,
            },
          ]}
          testID="screen"
        />
      )}
      <Type set="ledgerBand" tone="silverFaint">
        {drawing.word}
      </Type>
    </View>
  );
};
