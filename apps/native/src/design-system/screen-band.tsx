import type { ReactElement } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
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

const DRAWN = {
  edge: { across: 0.62, top: 12, height: 3, radius: 2 },
  fall: { inset: 0.08, taper: 0.084, top: 15, reach: 135, lit: 0.1 },
  glow: {
    near: { dy: 2, spread: 9, lit: 0.5 },
    far: { dy: 8, spread: 22, lit: 0.25 },
  },
  across: [
    { at: 0, tone: "beamDim", lit: 0 },
    { at: 0.12, tone: "beamDim", lit: 1 },
    { at: 0.5, tone: "silver", lit: 1 },
    { at: 0.88, tone: "beamDim", lit: 1 },
    { at: 1, tone: "beamDim", lit: 0 },
  ],
} as const;

const styles = StyleSheet.create({
  band: { alignItems: "center", paddingBottom: 13, paddingTop: 12 },
  drawing: { left: 0, position: "absolute", top: 0 },
  unlit: { borderRadius: 1, height: 4, opacity: 0.9, position: "absolute" },
  word: { paddingTop: 12 },
});

const edgeOn = (band: number) => ({
  width: band * DRAWN.edge.across,
  left: (band * (1 - DRAWN.edge.across)) / 2,
});

const coneOn = (band: number) => {
  const left = band * DRAWN.fall.inset;
  const right = band - left;
  const taper = band * DRAWN.fall.taper;
  return [
    [left + taper, DRAWN.fall.top],
    [right - taper, DRAWN.fall.top],
    [right, DRAWN.fall.reach],
    [left, DRAWN.fall.reach],
  ]
    .map((corner) => corner.join(","))
    .join(" ");
};

const Lit = ({
  band,
  colours,
}: {
  readonly band: number;
  readonly colours: Palette;
}) => {
  const edge = edgeOn(band);

  return (
    <Svg
      height={DRAWN.fall.reach}
      pointerEvents="none"
      style={styles.drawing}
      testID="lights"
      width={band}
    >
      <Defs>
        <LinearGradient id="edge" x1="0" x2="1" y1="0" y2="0">
          {DRAWN.across.map((stop) => (
            <Stop
              key={stop.at}
              offset={stop.at}
              stopColor={colours[stop.tone]}
              stopOpacity={stop.lit}
            />
          ))}
        </LinearGradient>
        <LinearGradient id="fall" x1="0" x2="0" y1="0" y2="1">
          <Stop
            offset={0}
            stopColor={colours.beam}
            stopOpacity={DRAWN.fall.lit}
          />
          <Stop offset={1} stopColor={colours.beam} stopOpacity={0} />
        </LinearGradient>
        <Filter
          filterUnits="userSpaceOnUse"
          height={DRAWN.fall.reach}
          id="glow"
          width={band}
          x={0}
          y={0}
        >
          <FeDropShadow
            dx={0}
            dy={DRAWN.glow.near.dy}
            floodColor={colours.beam}
            floodOpacity={DRAWN.glow.near.lit}
            stdDeviation={DRAWN.glow.near.spread}
          />
          <FeDropShadow
            dx={0}
            dy={DRAWN.glow.far.dy}
            floodColor={colours.beam}
            floodOpacity={DRAWN.glow.far.lit}
            stdDeviation={DRAWN.glow.far.spread}
          />
        </Filter>
      </Defs>
      <Polygon fill="url(#fall)" points={coneOn(band)} testID="beam" />
      <Rect
        fill="url(#edge)"
        filter="url(#glow)"
        height={DRAWN.edge.height}
        rx={DRAWN.edge.radius}
        testID="screen"
        width={edge.width}
        x={edge.left}
        y={DRAWN.edge.top}
      />
    </Svg>
  );
};

export const ScreenBand = (): ReactElement => {
  const { appearance, colours } = useTheme();
  const band = useWindowDimensions().width;
  const edge = edgeOn(band);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.band}
    >
      {appearance === "down" ? (
        <Lit band={band} colours={colours} />
      ) : (
        <View
          style={[
            styles.unlit,
            edge,
            { backgroundColor: colours.beam, top: DRAWN.edge.top },
          ]}
          testID="screen"
        />
      )}
      <Type set="ledgerBand" style={styles.word} tone="silverFaint">
        Seatscout
      </Type>
    </View>
  );
};
