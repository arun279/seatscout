import type { ReactElement } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  FeDropShadow,
  Filter,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { Type } from "../design-system/type.js";
import { type Palette, useTheme } from "../theme.js";

const DRAWN = {
  edge: { across: 0.84, top: 4, height: 2.5, radius: 2 },
  glow: { dy: 2, spread: 7, lit: 0.55 },
  unlit: { height: 3, opacity: 0.9 },
  band: { height: 22, word: 10 },
  across: [
    { at: 0, tone: "beamDim", lit: 0 },
    { at: 0.1, tone: "beamDim", lit: 1 },
    { at: 0.5, tone: "silver", lit: 1 },
    { at: 0.9, tone: "beamDim", lit: 1 },
    { at: 1, tone: "beamDim", lit: 0 },
  ],
} as const;

const styles = StyleSheet.create({
  band: { height: DRAWN.band.height },
  drawing: { left: 0, position: "absolute", top: 0 },
  unlit: {
    borderRadius: DRAWN.edge.radius,
    height: DRAWN.unlit.height,
    opacity: DRAWN.unlit.opacity,
    position: "absolute",
    top: DRAWN.edge.top,
  },
  word: {
    position: "absolute",
    textAlign: "center",
    top: DRAWN.band.word,
    width: "100%",
  },
});

const edgeOn = (span: number) => ({
  width: span * DRAWN.edge.across,
  left: (span * (1 - DRAWN.edge.across)) / 2,
});

const Lit = ({
  span,
  colours,
}: {
  readonly span: number;
  readonly colours: Palette;
}) => {
  const edge = edgeOn(span);

  return (
    <Svg
      height={DRAWN.band.height}
      pointerEvents="none"
      style={styles.drawing}
      testID="lamp"
      width={span}
    >
      <Defs>
        <LinearGradient id="map-edge" x1="0" x2="1" y1="0" y2="0">
          {DRAWN.across.map((stop) => (
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
          height={DRAWN.band.height}
          id="map-glow"
          width={span}
          x={0}
          y={0}
        >
          <FeDropShadow
            dx={0}
            dy={DRAWN.glow.dy}
            floodColor={colours.beam}
            floodOpacity={DRAWN.glow.lit}
            stdDeviation={DRAWN.glow.spread}
          />
        </Filter>
      </Defs>
      <Rect
        fill="url(#map-edge)"
        filter="url(#map-glow)"
        height={DRAWN.edge.height}
        rx={DRAWN.edge.radius}
        testID="edge"
        width={edge.width}
        x={edge.left}
        y={DRAWN.edge.top}
      />
    </Svg>
  );
};

export const ScreenEdge = ({
  span,
}: {
  readonly span: number;
}): ReactElement => {
  const { appearance, colours } = useTheme();

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.band, { width: span }]}
      testID="screen-edge"
    >
      {appearance === "down" ? (
        <Lit colours={colours} span={span} />
      ) : (
        <View
          style={[
            styles.unlit,
            { ...edgeOn(span), backgroundColor: colours.beam },
          ]}
          testID="lamp"
        />
      )}
      <Type set="ledgerBand" style={styles.word} tone="silverFaint">
        Screen
      </Type>
    </View>
  );
};
