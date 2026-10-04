import { test } from "@jest/globals";
import { REFERENCE } from "@seatscout/client";
import type { Terms } from "@seatscout/view-logic";
import { screen } from "@testing-library/react-native";
import { measureRenders } from "reassure";
import { Ask } from "../src/ask/ask.js";
import { nearby, phone } from "./phone.js";

const TODAY = "2026-09-19";

const NEAR: Terms = { date: TODAY, area: "75234", partySize: 2 };

test("the Ask sheet with every term and the calendar", async () => {
  await measureRenders(
    <Ask
      focus={undefined}
      onFind={() => undefined}
      onKeep={() => undefined}
      profile={REFERENCE}
      seatscout={
        phone([], {
          playing: {
            area: "75234",
            date: TODAY,
            programme: {
              theaters: nearby("aacbt", "Cinemark Dallas XD and IMAX"),
              movies: [
                { id: "23184", title: "Akira" },
                { id: "246329", title: "Coyote vs. Acme" },
              ],
              unreached: [],
            },
          },
        }).seatscout
      }
      terms={NEAR}
      today={TODAY}
    />,
    {
      scenario: async () => {
        await screen.findByRole("button", { name: "Coyote vs. Acme" });
        await screen.findByRole("button", { name: "Find seats" });
      },
    },
  );
});
