import { test } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { screen } from "@testing-library/react-native";
import { measureRenders } from "reassure";
import { phone } from "./phone.js";
import { Search } from "../src/search/search.js";

const TODAY = "2026-09-19";

const SHORT: Terms = { date: TODAY, partySize: 2 };

test("the Search screen's prompt face, drawn and read", async () => {
  await measureRenders(
    <Search
      onAsk={() => undefined}
      onRun={() => undefined}
      profile={REFERENCE}
      seatscout={phone().seatscout}
      terms={SHORT}
      today={TODAY}
    />,
    {
      scenario: async () => {
        await screen.findByRole("button", { name: "Find seats" });
        await screen.findByRole("button", { name: "Which movie?" });
      },
    },
  );
});
