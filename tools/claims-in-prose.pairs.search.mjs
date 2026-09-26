const PRODUCT = ["packages", ":!*.test.ts", ":!*.fixtures.ts"];

export const SEARCH_CLAIMS = [
  {
    adr: "0016-a-search-reports-its-coverage.md",
    says: /\*\*The fan-out is 24 workers over one queue\.\*\*/,
    holds: "the fan-out width the search runs at",
    pattern: "WIDTH = 24",
    paths: ["packages/client/src/fan-out.ts"],
    files: 1,
  },
  {
    adr: "0017-retry-and-the-breaker-follow-published-policy.md",
    says: /\*\*The breaker is the three states of Nygard's/,
    holds: "modules naming the circuit breaker",
    pattern: "breaker",
    paths: PRODUCT,
    files: 2,
  },
  {
    adr: "0020-a-search-over-several-days-reads-48-seat-maps-at-a-time.md",
    says: /`SEAT_MAP_BUDGET` in\s+`packages\/client\/src\/budget\.ts` is 48/,
    holds:
      "the seat maps a search over several days reads before a person asks for more",
    pattern: "SEAT_MAP_BUDGET = 48",
    paths: ["packages/client/src/budget.ts"],
    files: 1,
  },
  {
    adr: "0020-a-search-over-several-days-reads-48-seat-maps-at-a-time.md",
    says: /any day in the next `HORIZON` days, 7/,
    holds: "the days any day reaches",
    pattern: "export const HORIZON = 7",
    paths: ["packages/view-logic/src/when.ts"],
    files: 1,
  },
  {
    adr: "0020-a-search-over-several-days-reads-48-seat-maps-at-a-time.md",
    says: /Every route reads 403 as `refused`/,
    holds: "the refusal every route of the Source shares",
    pattern: '403: "refused"',
    paths: ["packages/core/src/source/aggregator.ts"],
    files: 1,
  },
  {
    adr: "0020-a-search-over-several-days-reads-48-seat-maps-at-a-time.md",
    says: /`seatscout\.recent\.v2`, and a history kept under the first is read into the second/,
    holds: "the key a history kept one date to a search is read from",
    pattern: '"seatscout.recent.v1"',
    paths: ["packages/client/src/recent.ts"],
    files: 1,
  },
  {
    adr: "0019-the-list-is-painted-once.md",
    says: /The query lives in the address as `movie`, `date`, `area`, `partySize`, `chain`/,
    holds: "the module that reads a query out of the address",
    pattern: "partySize",
    paths: ["packages/view-logic/src/terms.ts"],
    files: 1,
  },
];
