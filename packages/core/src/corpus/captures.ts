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
import afcAapoy559055311 from "./seatmaps/AFC-aapoy-559055311.json" with {
  type: "json",
};
import afcAapoy561230736 from "./seatmaps/AFC-aapoy-561230736.json" with {
  type: "json",
};
import alamAawym561478479 from "./seatmaps/ALAM-aawym-561478479.json" with {
  type: "json",
};
import alamAaxtr561609773 from "./seatmaps/ALAM-aaxtr-561609773.json" with {
  type: "json",
};
import alamAaygw561457969 from "./seatmaps/ALAM-aaygw-561457969.json" with {
  type: "json",
};
import alamAayhw561505814 from "./seatmaps/ALAM-aayhw-561505814.json" with {
  type: "json",
};
import amcAacrp561748075 from "./seatmaps/AMC-aacrp-561748075.json" with {
  type: "json",
};
import amcAaego561882799 from "./seatmaps/AMC-aaego-561882799.json" with {
  type: "json",
};
import amcAaoxj561549583 from "./seatmaps/AMC-aaoxj-561549583.json" with {
  type: "json",
};
import amcAatzh561565820 from "./seatmaps/AMC-aatzh-561565820.json" with {
  type: "json",
};
import amcAaxju561462741 from "./seatmaps/AMC-aaxju-561462741.json" with {
  type: "json",
};
import cnmkAacbt561682781 from "./seatmaps/CNMK-aacbt-561682781.json" with {
  type: "json",
};
import cnmkAacbt561682851 from "./seatmaps/CNMK-aacbt-561682851.json" with {
  type: "json",
};
import cnmkAacbz561774053 from "./seatmaps/CNMK-aacbz-561774053.json" with {
  type: "json",
};
import cnmkAacut561865199 from "./seatmaps/CNMK-aacut-561865199.json" with {
  type: "json",
};
import cnmkAaudu561740133 from "./seatmaps/CNMK-aaudu-561740133.json" with {
  type: "json",
};
import cplsAaxpp561562293 from "./seatmaps/CPLS-aaxpp-561562293.json" with {
  type: "json",
};
import cplsAaxpp561562311 from "./seatmaps/CPLS-aaxpp-561562311.json" with {
  type: "json",
};
import cplsAayfm561755033 from "./seatmaps/CPLS-aayfm-561755033.json" with {
  type: "json",
};
import cplsAaykn561527779 from "./seatmaps/CPLS-aaykn-561527779.json" with {
  type: "json",
};
import flixAayja561409686 from "./seatmaps/FLIX-aayja-561409686.json" with {
  type: "json",
};
import flixAayja561409722 from "./seatmaps/FLIX-aayja-561409722.json" with {
  type: "json",
};
import flixAayja561409762 from "./seatmaps/FLIX-aayja-561409762.json" with {
  type: "json",
};
import flixAayja561409765 from "./seatmaps/FLIX-aayja-561409765.json" with {
  type: "json",
};
import glxyAayyj558983758 from "./seatmaps/GLXY-aayyj-558983758.json" with {
  type: "json",
};
import glxyAayyj561641004 from "./seatmaps/GLXY-aayyj-561641004.json" with {
  type: "json",
};
import glxyAayyj561641328 from "./seatmaps/GLXY-aayyj-561641328.json" with {
  type: "json",
};
import glxyAayyj561641342 from "./seatmaps/GLXY-aayyj-561641342.json" with {
  type: "json",
};
import hookAaqfm561633859 from "./seatmaps/HOOK-aaqfm-561633859.json" with {
  type: "json",
};
import hookAauac561644741 from "./seatmaps/HOOK-aauac-561644741.json" with {
  type: "json",
};
import hookAawza561527971 from "./seatmaps/HOOK-aawza-561527971.json" with {
  type: "json",
};
import hookAawza561527997 from "./seatmaps/HOOK-aawza-561527997.json" with {
  type: "json",
};
import lAaddm561442975 from "./seatmaps/L-aaddm-561442975.json" with {
  type: "json",
};
import reglAacaw558585360 from "./seatmaps/REGL-aacaw-558585360.json" with {
  type: "json",
};
import reglAacaw561898204 from "./seatmaps/REGL-aacaw-561898204.json" with {
  type: "json",
};
import reglAacaw561898208 from "./seatmaps/REGL-aacaw-561898208.json" with {
  type: "json",
};
import reglAacaw561898261 from "./seatmaps/REGL-aacaw-561898261.json" with {
  type: "json",
};
import smgAabed562032831 from "./seatmaps/SMG-aabed-562032831.json" with {
  type: "json",
};
import smgAautc562120610 from "./seatmaps/SMG-aautc-562120610.json" with {
  type: "json",
};
import smgAawup561783660 from "./seatmaps/SMG-aawup-561783660.json" with {
  type: "json",
};
import smgAaxps561728326 from "./seatmaps/SMG-aaxps-561728326.json" with {
  type: "json",
};
import vzAaysq561443345 from "./seatmaps/VZ-aaysq-561443345.json" with {
  type: "json",
};
import vzAaysq561443380 from "./seatmaps/VZ-aaysq-561443380.json" with {
  type: "json",
};
import vzAaysq561443492 from "./seatmaps/VZ-aaysq-561443492.json" with {
  type: "json",
};
import vzAaysq561443587 from "./seatmaps/VZ-aaysq-561443587.json" with {
  type: "json",
};
import grouping24381920260828 from "./showtimes/grouping-243819-2026-08-28.json" with {
  type: "json",
};
import grouping24556920260827 from "./showtimes/grouping-245569-2026-08-27.json" with {
  type: "json",
};
import grouping24556920260828 from "./showtimes/grouping-245569-2026-08-28.json" with {
  type: "json",
};
import grouping24632920260828 from "./showtimes/grouping-246329-2026-08-28.json" with {
  type: "json",
};
import grouping24642720260828 from "./showtimes/grouping-246427-2026-08-28.json" with {
  type: "json",
};
import theaterShowtimesAacbt20260828 from "./showtimes/theater-showtimes-aacbt-2026-08-28.json" with {
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
  ["seatmaps/AFC-aapoy-559055311.json", afcAapoy559055311],
  ["seatmaps/AFC-aapoy-561230736.json", afcAapoy561230736],
  ["seatmaps/ALAM-aawym-561478479.json", alamAawym561478479],
  ["seatmaps/ALAM-aaxtr-561609773.json", alamAaxtr561609773],
  ["seatmaps/ALAM-aaygw-561457969.json", alamAaygw561457969],
  ["seatmaps/ALAM-aayhw-561505814.json", alamAayhw561505814],
  ["seatmaps/AMC-aacrp-561748075.json", amcAacrp561748075],
  ["seatmaps/AMC-aaego-561882799.json", amcAaego561882799],
  ["seatmaps/AMC-aatzh-561565820.json", amcAatzh561565820],
  ["seatmaps/AMC-aaxju-561462741.json", amcAaxju561462741],
  ["seatmaps/CNMK-aacbt-561682851.json", cnmkAacbt561682851],
  ["seatmaps/CNMK-aacbz-561774053.json", cnmkAacbz561774053],
  ["seatmaps/CNMK-aacut-561865199.json", cnmkAacut561865199],
  ["seatmaps/CNMK-aaudu-561740133.json", cnmkAaudu561740133],
  ["seatmaps/CPLS-aaxpp-561562293.json", cplsAaxpp561562293],
  ["seatmaps/CPLS-aaxpp-561562311.json", cplsAaxpp561562311],
  ["seatmaps/CPLS-aayfm-561755033.json", cplsAayfm561755033],
  ["seatmaps/CPLS-aaykn-561527779.json", cplsAaykn561527779],
  ["seatmaps/FLIX-aayja-561409686.json", flixAayja561409686],
  ["seatmaps/FLIX-aayja-561409722.json", flixAayja561409722],
  ["seatmaps/FLIX-aayja-561409762.json", flixAayja561409762],
  ["seatmaps/FLIX-aayja-561409765.json", flixAayja561409765],
  ["seatmaps/GLXY-aayyj-558983758.json", glxyAayyj558983758],
  ["seatmaps/GLXY-aayyj-561641004.json", glxyAayyj561641004],
  ["seatmaps/GLXY-aayyj-561641328.json", glxyAayyj561641328],
  ["seatmaps/GLXY-aayyj-561641342.json", glxyAayyj561641342],
  ["seatmaps/HOOK-aaqfm-561633859.json", hookAaqfm561633859],
  ["seatmaps/HOOK-aauac-561644741.json", hookAauac561644741],
  ["seatmaps/HOOK-aawza-561527971.json", hookAawza561527971],
  ["seatmaps/HOOK-aawza-561527997.json", hookAawza561527997],
  ["seatmaps/REGL-aacaw-558585360.json", reglAacaw558585360],
  ["seatmaps/REGL-aacaw-561898204.json", reglAacaw561898204],
  ["seatmaps/REGL-aacaw-561898208.json", reglAacaw561898208],
  ["seatmaps/REGL-aacaw-561898261.json", reglAacaw561898261],
  ["seatmaps/SMG-aabed-562032831.json", smgAabed562032831],
  ["seatmaps/SMG-aautc-562120610.json", smgAautc562120610],
  ["seatmaps/SMG-aawup-561783660.json", smgAawup561783660],
  ["seatmaps/SMG-aaxps-561728326.json", smgAaxps561728326],
  ["seatmaps/VZ-aaysq-561443345.json", vzAaysq561443345],
  ["seatmaps/VZ-aaysq-561443380.json", vzAaysq561443380],
  ["seatmaps/VZ-aaysq-561443492.json", vzAaysq561443492],
  ["seatmaps/VZ-aaysq-561443587.json", vzAaysq561443587],
]);

export const seatMapFailureCaptures: ReadonlyMap<
  string,
  Capture<readonly CapturedUpstreamError[]>
> = new Map([
  ["seatmaps/AMC-aaoxj-561549583.json", amcAaoxj561549583],
  ["seatmaps/CNMK-aacbt-561682781.json", cnmkAacbt561682781],
  ["seatmaps/L-aaddm-561442975.json", lAaddm561442975],
]);

export const showtimeGroupingCaptures: ReadonlyMap<
  string,
  Capture<CapturedShowtimeGrouping>
> = new Map([
  ["showtimes/grouping-243819-2026-08-28.json", grouping24381920260828],
  ["showtimes/grouping-245569-2026-08-27.json", grouping24556920260827],
  ["showtimes/grouping-245569-2026-08-28.json", grouping24556920260828],
  ["showtimes/grouping-246329-2026-08-28.json", grouping24632920260828],
  ["showtimes/grouping-246427-2026-08-28.json", grouping24642720260828],
]);

export const theaterMovieShowtimesCaptures: ReadonlyMap<
  string,
  Capture<CapturedTheaterMovieShowtimes>
> = new Map([
  [
    "showtimes/theater-showtimes-aacbt-2026-08-28.json",
    theaterShowtimesAacbt20260828,
  ],
]);

export const nearbyTheatersCaptures: ReadonlyMap<
  string,
  Capture<CapturedNearbyTheaters>
> = new Map([["theaters/nearby-theaters.json", nearbyTheaters]]);
