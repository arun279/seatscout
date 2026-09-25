import { test } from "@jest/globals";
import { REFERENCE, type SearchTerms } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { screen } from "@testing-library/react-native";
import { measureRenders } from "reassure";
import { Results } from "../src/search/results.js";
import { Search } from "../src/search/search.js";
import { phone } from "./phone.js";
import { NOTHING_READ, NOW, still, TODAY } from "./rooms.js";

const PROMPT_DAY = "2026-09-19";

const SHORT: Terms = { date: PROMPT_DAY, partySize: 2 };

const WHOLE_LISTING: Terms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
};

const WHOLE_SEARCH: SearchTerms = {
  movie: "245569",
  date: TODAY,
  area: "75006",
  partySize: 2,
  accessibleSeating: false,
};

const nothing = () => undefined;

test("the Search screen's prompt face, drawn and read", async () => {
  await measureRenders(
    <Search
      clock={still(NOW)}
      onAsk={nothing}
      onHandOff={nothing}
      onLedger={nothing}
      online
      onRoom={nothing}
      onRun={nothing}
      profile={REFERENCE}
      seatscout={phone().seatscout}
      terms={SHORT}
      today={PROMPT_DAY}
    />,
    {
      scenario: async () => {
        await screen.findByRole("button", { name: "Find seats" });
        await screen.findByRole("button", { name: "Which movie?" });
      },
    },
  );
});

test("the Search screen's ranked Seat Groups, over the whole corpus", async () => {
  await measureRenders(
    <Results
      asked={WHOLE_SEARCH}
      clock={still(NOW)}
      onEdit={nothing}
      onHandOff={nothing}
      onLedger={nothing}
      online
      onRoom={nothing}
      profile={REFERENCE}
      programme={NOTHING_READ}
      seatscout={phone([], { script: {} }).seatscout}
      terms={WHOLE_LISTING}
      today={TODAY}
    />,
    {
      scenario: async () => {
        await screen.findByText(/^\d+ showtimes$/);
      },
    },
  );
});
