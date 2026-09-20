import type {
  Capture,
  CapturedNearbyTheaters,
  CapturedSeatMap,
  CapturedShowtimeGrouping,
  CapturedTheaterMovieShowtimes,
  CapturedUpstreamError,
  CorpusManifest,
} from "./types.js";
import manifest from "./manifest.json" with { type: "json" };
import afcAapoy564402231 from "./seatmaps/AFC-aapoy-564402231.json" with {
  type: "json",
};
import afcAapoy564402238 from "./seatmaps/AFC-aapoy-564402238.json" with {
  type: "json",
};
import alamAawym562697591 from "./seatmaps/ALAM-aawym-562697591.json" with {
  type: "json",
};
import alamAaxtr564216396 from "./seatmaps/ALAM-aaxtr-564216396.json" with {
  type: "json",
};
import alamAaygw562695784 from "./seatmaps/ALAM-aaygw-562695784.json" with {
  type: "json",
};
import alamAayhw564186789 from "./seatmaps/ALAM-aayhw-564186789.json" with {
  type: "json",
};
import amcAacrp562185322 from "./seatmaps/AMC-aacrp-562185322.json" with {
  type: "json",
};
import amcAaego561432171 from "./seatmaps/AMC-aaego-561432171.json" with {
  type: "json",
};
import amcAatzh564755702 from "./seatmaps/AMC-aatzh-564755702.json" with {
  type: "json",
};
import amcAaxju562247516 from "./seatmaps/AMC-aaxju-562247516.json" with {
  type: "json",
};
import cnmkAacbt564335359 from "./seatmaps/CNMK-aacbt-564335359.json" with {
  type: "json",
};
import cnmkAacbt564335424 from "./seatmaps/CNMK-aacbt-564335424.json" with {
  type: "json",
};
import cnmkAacbz564614760 from "./seatmaps/CNMK-aacbz-564614760.json" with {
  type: "json",
};
import cnmkAacut562212808 from "./seatmaps/CNMK-aacut-562212808.json" with {
  type: "json",
};
import cnmkAaudu562433543 from "./seatmaps/CNMK-aaudu-562433543.json" with {
  type: "json",
};
import cplsAaxpp564442282 from "./seatmaps/CPLS-aaxpp-564442282.json" with {
  type: "json",
};
import cplsAaxpp564442283 from "./seatmaps/CPLS-aaxpp-564442283.json" with {
  type: "json",
};
import cplsAayfm564435732 from "./seatmaps/CPLS-aayfm-564435732.json" with {
  type: "json",
};
import cplsAaykn564430998 from "./seatmaps/CPLS-aaykn-564430998.json" with {
  type: "json",
};
import flixAayja564235339 from "./seatmaps/FLIX-aayja-564235339.json" with {
  type: "json",
};
import flixAayja564235466 from "./seatmaps/FLIX-aayja-564235466.json" with {
  type: "json",
};
import flixAayja564235483 from "./seatmaps/FLIX-aayja-564235483.json" with {
  type: "json",
};
import flixAayja565020193 from "./seatmaps/FLIX-aayja-565020193.json" with {
  type: "json",
};
import glxyAayyj562206728 from "./seatmaps/GLXY-aayyj-562206728.json" with {
  type: "json",
};
import glxyAayyj564402749 from "./seatmaps/GLXY-aayyj-564402749.json" with {
  type: "json",
};
import glxyAayyj564402776 from "./seatmaps/GLXY-aayyj-564402776.json" with {
  type: "json",
};
import glxyAayyj564402869 from "./seatmaps/GLXY-aayyj-564402869.json" with {
  type: "json",
};
import hookAaqfm562494552 from "./seatmaps/HOOK-aaqfm-562494552.json" with {
  type: "json",
};
import hookAauac564445998 from "./seatmaps/HOOK-aauac-564445998.json" with {
  type: "json",
};
import hookAawza564424799 from "./seatmaps/HOOK-aawza-564424799.json" with {
  type: "json",
};
import hookAawza564424818 from "./seatmaps/HOOK-aawza-564424818.json" with {
  type: "json",
};
import lAaddm563960289 from "./seatmaps/L-aaddm-563960289.json" with {
  type: "json",
};
import reglAacaw562432170 from "./seatmaps/REGL-aacaw-562432170.json" with {
  type: "json",
};
import reglAacaw564679715 from "./seatmaps/REGL-aacaw-564679715.json" with {
  type: "json",
};
import reglAacaw564679720 from "./seatmaps/REGL-aacaw-564679720.json" with {
  type: "json",
};
import reglAacaw564679794 from "./seatmaps/REGL-aacaw-564679794.json" with {
  type: "json",
};
import smgAabed562224145 from "./seatmaps/SMG-aabed-562224145.json" with {
  type: "json",
};
import smgAautc564877473 from "./seatmaps/SMG-aautc-564877473.json" with {
  type: "json",
};
import smgAaxps564270324 from "./seatmaps/SMG-aaxps-564270324.json" with {
  type: "json",
};
import smgAaxps564270326 from "./seatmaps/SMG-aaxps-564270326.json" with {
  type: "json",
};
import vzAaysq559982630 from "./seatmaps/VZ-aaysq-559982630.json" with {
  type: "json",
};
import vzAaysq562687836 from "./seatmaps/VZ-aaysq-562687836.json" with {
  type: "json",
};
import vzAaysq562687878 from "./seatmaps/VZ-aaysq-562687878.json" with {
  type: "json",
};
import vzAaysq564236170 from "./seatmaps/VZ-aaysq-564236170.json" with {
  type: "json",
};
import grouping24381920260920 from "./showtimes/grouping-243819-2026-09-20.json" with {
  type: "json",
};
import grouping24569920260920 from "./showtimes/grouping-245699-2026-09-20.json" with {
  type: "json",
};
import grouping24589320260919 from "./showtimes/grouping-245893-2026-09-19.json" with {
  type: "json",
};
import grouping24589320260920 from "./showtimes/grouping-245893-2026-09-20.json" with {
  type: "json",
};
import grouping24647320260920 from "./showtimes/grouping-246473-2026-09-20.json" with {
  type: "json",
};
import theaterShowtimesAacbt20260920 from "./showtimes/theater-showtimes-aacbt-2026-09-20.json" with {
  type: "json",
};
import nearbyTheaters from "./theaters/nearby-theaters.json" with {
  type: "json",
};

export const corpusManifest: CorpusManifest = manifest;

export const seatMapCaptures: ReadonlyMap<
  string,
  Capture<CapturedSeatMap>
> = new Map([
  ["seatmaps/AFC-aapoy-564402231.json", afcAapoy564402231],
  ["seatmaps/AFC-aapoy-564402238.json", afcAapoy564402238],
  ["seatmaps/ALAM-aawym-562697591.json", alamAawym562697591],
  ["seatmaps/ALAM-aaxtr-564216396.json", alamAaxtr564216396],
  ["seatmaps/ALAM-aaygw-562695784.json", alamAaygw562695784],
  ["seatmaps/ALAM-aayhw-564186789.json", alamAayhw564186789],
  ["seatmaps/AMC-aacrp-562185322.json", amcAacrp562185322],
  ["seatmaps/AMC-aaego-561432171.json", amcAaego561432171],
  ["seatmaps/AMC-aatzh-564755702.json", amcAatzh564755702],
  ["seatmaps/AMC-aaxju-562247516.json", amcAaxju562247516],
  ["seatmaps/CNMK-aacbt-564335424.json", cnmkAacbt564335424],
  ["seatmaps/CNMK-aacbz-564614760.json", cnmkAacbz564614760],
  ["seatmaps/CNMK-aacut-562212808.json", cnmkAacut562212808],
  ["seatmaps/CNMK-aaudu-562433543.json", cnmkAaudu562433543],
  ["seatmaps/CPLS-aaxpp-564442282.json", cplsAaxpp564442282],
  ["seatmaps/CPLS-aaxpp-564442283.json", cplsAaxpp564442283],
  ["seatmaps/CPLS-aayfm-564435732.json", cplsAayfm564435732],
  ["seatmaps/CPLS-aaykn-564430998.json", cplsAaykn564430998],
  ["seatmaps/FLIX-aayja-564235339.json", flixAayja564235339],
  ["seatmaps/FLIX-aayja-564235466.json", flixAayja564235466],
  ["seatmaps/FLIX-aayja-564235483.json", flixAayja564235483],
  ["seatmaps/FLIX-aayja-565020193.json", flixAayja565020193],
  ["seatmaps/GLXY-aayyj-562206728.json", glxyAayyj562206728],
  ["seatmaps/GLXY-aayyj-564402749.json", glxyAayyj564402749],
  ["seatmaps/GLXY-aayyj-564402776.json", glxyAayyj564402776],
  ["seatmaps/GLXY-aayyj-564402869.json", glxyAayyj564402869],
  ["seatmaps/HOOK-aaqfm-562494552.json", hookAaqfm562494552],
  ["seatmaps/HOOK-aauac-564445998.json", hookAauac564445998],
  ["seatmaps/HOOK-aawza-564424799.json", hookAawza564424799],
  ["seatmaps/HOOK-aawza-564424818.json", hookAawza564424818],
  ["seatmaps/REGL-aacaw-562432170.json", reglAacaw562432170],
  ["seatmaps/REGL-aacaw-564679715.json", reglAacaw564679715],
  ["seatmaps/REGL-aacaw-564679720.json", reglAacaw564679720],
  ["seatmaps/REGL-aacaw-564679794.json", reglAacaw564679794],
  ["seatmaps/SMG-aabed-562224145.json", smgAabed562224145],
  ["seatmaps/SMG-aautc-564877473.json", smgAautc564877473],
  ["seatmaps/SMG-aaxps-564270324.json", smgAaxps564270324],
  ["seatmaps/SMG-aaxps-564270326.json", smgAaxps564270326],
  ["seatmaps/VZ-aaysq-559982630.json", vzAaysq559982630],
  ["seatmaps/VZ-aaysq-562687836.json", vzAaysq562687836],
  ["seatmaps/VZ-aaysq-562687878.json", vzAaysq562687878],
  ["seatmaps/VZ-aaysq-564236170.json", vzAaysq564236170],
]);

export const seatMapFailureCaptures: ReadonlyMap<
  string,
  Capture<readonly CapturedUpstreamError[]>
> = new Map([
  ["seatmaps/CNMK-aacbt-564335359.json", cnmkAacbt564335359],
  ["seatmaps/L-aaddm-563960289.json", lAaddm563960289],
]);

export const showtimeGroupingCaptures: ReadonlyMap<
  string,
  Capture<CapturedShowtimeGrouping>
> = new Map([
  ["showtimes/grouping-243819-2026-09-20.json", grouping24381920260920],
  ["showtimes/grouping-245699-2026-09-20.json", grouping24569920260920],
  ["showtimes/grouping-245893-2026-09-19.json", grouping24589320260919],
  ["showtimes/grouping-245893-2026-09-20.json", grouping24589320260920],
  ["showtimes/grouping-246473-2026-09-20.json", grouping24647320260920],
]);

export const theaterMovieShowtimesCaptures: ReadonlyMap<
  string,
  Capture<CapturedTheaterMovieShowtimes>
> = new Map([
  [
    "showtimes/theater-showtimes-aacbt-2026-09-20.json",
    theaterShowtimesAacbt20260920,
  ],
]);

export const nearbyTheatersCaptures: ReadonlyMap<
  string,
  Capture<CapturedNearbyTheaters>
> = new Map([["theaters/nearby-theaters.json", nearbyTheaters]]);
