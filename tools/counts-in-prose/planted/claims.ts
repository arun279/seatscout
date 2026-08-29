import type { Claim } from "../src/judge.ts";
import { alternativesOf, fieldsOf } from "../src/structures.ts";

const PROSE = "tools/counts-in-prose/planted/prose.md";
const STRUCTURE = "tools/counts-in-prose/planted/structure.ts.txt";

export const AGREES = `the fields of PlantedSeat, in ${STRUCTURE}`;
export const DISAGREES = `the alternatives of PlantedGap, in ${STRUCTURE}`;

export const PLANTED: readonly Claim[] = [
  {
    document: PROSE,
    says: /A planted Seat carries (\w+) fields\./,
    about: AGREES,
    count: (read) => fieldsOf(read, STRUCTURE, "PlantedSeat").length,
  },
  {
    document: PROSE,
    says: /A planted Gap is one of (\w+) bands\./,
    about: DISAGREES,
    count: (read) => alternativesOf(read, STRUCTURE, "PlantedGap").length,
  },
];
