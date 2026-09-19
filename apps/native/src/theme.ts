import {
  type ColorSchemeName,
  type TextStyle,
  useColorScheme,
} from "react-native";
import bigShouldersDisplaySemiBold from "../assets/fonts/BigShouldersDisplay-SemiBold.ttf";
import schibstedGroteskBold from "../assets/fonts/SchibstedGrotesk-Bold.ttf";
import schibstedGroteskRegular from "../assets/fonts/SchibstedGrotesk-Regular.ttf";
import splineSansMonoRegular from "../assets/fonts/SplineSansMono-Regular.ttf";

export interface Palette {
  readonly houseDeep: string;
  readonly house: string;
  readonly chrome: string;
  readonly raised: string;
  readonly high: string;
  readonly hairline: string;
  readonly silver: string;
  readonly silverDim: string;
  readonly silverFaint: string;
  readonly velvet: string;
  readonly velvetDeep: string;
  readonly velvetLit: string;
  readonly beam: string;
  readonly beamDim: string;
  readonly seatFree: string;
  readonly seatGone: string;
}

const DOWN: Palette = {
  houseDeep: "#06070e",
  house: "#0d0f19",
  chrome: "#0a0c15",
  raised: "#161926",
  high: "#202333",
  hairline: "#323748",
  silver: "#e6ecf2",
  silverDim: "#aab2bd",
  silverFaint: "#a0a8b5",
  velvet: "#c01242",
  velvetDeep: "#9d0031",
  velvetLit: "#f798a4",
  beam: "#b3dff5",
  beamDim: "#82bad5",
  seatFree: "#8b9aab",
  seatGone: "#697187",
};

const UP: Palette = {
  houseDeep: "#f3ece0",
  house: "#f9f4e9",
  chrome: "#fefaf1",
  raised: "#fffdf9",
  high: "#e2d8c6",
  hairline: "#cabdaa",
  silver: "#231e17",
  silverDim: "#585047",
  silverFaint: "#655c52",
  velvet: "#a6163a",
  velvetDeep: "#87072b",
  velvetLit: "#940331",
  beam: "#213a53",
  beamDim: "#3d556d",
  seatFree: "#745e4e",
  seatGone: "#8e7c6b",
};

const DISPLAY = "BigShouldersDisplay-SemiBold";
const BODY = "SchibstedGrotesk-Regular";
const BODY_BOLD = "SchibstedGrotesk-Bold";
const MONO = "SplineSansMono-Regular";

export const FACES: Readonly<Record<string, number>> = {
  [DISPLAY]: bigShouldersDisplaySemiBold,
  [BODY]: schibstedGroteskRegular,
  [BODY_BOLD]: schibstedGroteskBold,
  [MONO]: splineSansMonoRegular,
};

interface TypeRole {
  readonly family: string;
  readonly size: number;
  readonly tracking: number;
  readonly leading: number;
  readonly transform: TextStyle["textTransform"];
  readonly cap?: number;
}

export type Role =
  | "marqueeHero"
  | "marqueeTitle"
  | "marqueeVerdict"
  | "marqueeRow"
  | "sentenceStrong"
  | "sentenceLead"
  | "sentence"
  | "sentenceSmall"
  | "ledgerCount"
  | "ledgerField"
  | "ledgerSeats"
  | "ledger"
  | "ledgerRow"
  | "ledgerLabel"
  | "ledgerTag"
  | "ledgerBand";

const TYPE: Readonly<Record<Role, TypeRole>> = {
  marqueeHero: {
    family: DISPLAY,
    size: 36,
    tracking: 0.025,
    leading: 0.98,
    transform: "uppercase",
    cap: 2,
  },
  marqueeTitle: {
    family: DISPLAY,
    size: 30,
    tracking: 0.025,
    leading: 0.98,
    transform: "uppercase",
    cap: 2,
  },
  marqueeVerdict: {
    family: DISPLAY,
    size: 31,
    tracking: 0.025,
    leading: 1,
    transform: "uppercase",
  },
  marqueeRow: {
    family: DISPLAY,
    size: 19,
    tracking: 0.025,
    leading: 1.05,
    transform: "uppercase",
  },
  sentenceStrong: {
    family: BODY_BOLD,
    size: 19,
    tracking: 0,
    leading: 1.2,
    transform: "none",
  },
  sentenceLead: {
    family: BODY_BOLD,
    size: 15,
    tracking: 0.002,
    leading: 1.25,
    transform: "none",
  },
  sentence: {
    family: BODY,
    size: 15,
    tracking: 0,
    leading: 1.55,
    transform: "none",
  },
  sentenceSmall: {
    family: BODY,
    size: 12,
    tracking: 0,
    leading: 1.5,
    transform: "none",
  },
  ledgerField: {
    family: MONO,
    size: 16,
    tracking: 0,
    leading: 1.25,
    transform: "none",
  },
  ledgerCount: {
    family: MONO,
    size: 21,
    tracking: 0,
    leading: 1.15,
    transform: "none",
  },
  ledgerSeats: {
    family: MONO,
    size: 13,
    tracking: 0.03,
    leading: 1.3,
    transform: "none",
  },
  ledger: {
    family: MONO,
    size: 12.5,
    tracking: 0.08,
    leading: 1.8,
    transform: "none",
  },
  ledgerRow: {
    family: MONO,
    size: 11,
    tracking: 0.04,
    leading: 1.5,
    transform: "none",
  },
  ledgerLabel: {
    family: MONO,
    size: 10.5,
    tracking: 0.18,
    leading: 1.5,
    transform: "uppercase",
  },
  ledgerTag: {
    family: MONO,
    size: 9.5,
    tracking: 0.13,
    leading: 1.5,
    transform: "uppercase",
  },
  ledgerBand: {
    family: MONO,
    size: 9,
    tracking: 0.44,
    leading: 1.5,
    transform: "uppercase",
  },
};

interface Spacing {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
  readonly xxl: number;
}

const SPACE: Spacing = { xs: 2, sm: 6, md: 9, lg: 14, xl: 18, xxl: 26 };

interface Radii {
  readonly control: number;
  readonly pill: number;
}

const RADIUS: Radii = { control: 14, pill: 100 };

export type Appearance = "down" | "up";

export interface Theme {
  readonly appearance: Appearance;
  readonly colours: Palette;
  readonly type: Readonly<Record<Role, TypeRole>>;
  readonly space: Spacing;
  readonly radius: Radii;
}

const THEMES: Readonly<Record<Appearance, Theme>> = {
  down: {
    appearance: "down",
    colours: DOWN,
    type: TYPE,
    space: SPACE,
    radius: RADIUS,
  },
  up: {
    appearance: "up",
    colours: UP,
    type: TYPE,
    space: SPACE,
    radius: RADIUS,
  },
};

export const appearanceOf = (scheme: ColorSchemeName): Appearance =>
  scheme === "light" ? "up" : "down";

export const themeFor = (appearance: Appearance): Theme => THEMES[appearance];

export const useTheme = (): Theme => themeFor(appearanceOf(useColorScheme()));
