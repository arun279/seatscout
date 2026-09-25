import type { Snapshot } from "@seatscout/client";
import { render } from "@testing-library/react";
import type { HeldSnapshots, Terms } from "@seatscout/view-logic";
import { Results } from "./results.js";
import { TODAY, TONIGHT } from "./search.fixtures.js";

export const listing = (
  snapshot: Snapshot,
  online = true,
  terms: Terms = TONIGHT,
): void => {
  const held: HeldSnapshots = {
    snapshot: () => snapshot,
    subscribe: () => () => {},
    hold: () => {},
    release: () => {},
    painted: () => snapshot,
  };
  render(
    <Results
      snapshot={snapshot}
      painted={snapshot}
      terms={terms}
      today={TODAY}
      now={0}
      held={held}
      online={online}
      onRetry={() => {}}
      onEdit={() => {}}
      onRoom={() => {}}
      onHandOff={() => {}}
    />,
  );
};
