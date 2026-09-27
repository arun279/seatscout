import { test } from "@jest/globals";
import { fireEvent, screen } from "@testing-library/react-native";
import { measureRenders } from "reassure";
import { HandOff } from "../src/hand-off/hand-off.js";
import { atTheCounter, type Counter, TODAY } from "./hand-off.js";

const drawn = (counter: Counter) => (
  <HandOff
    checkout={() => Promise.resolve()}
    chosen={counter.chosen}
    clock={counter.clock}
    onClose={() => undefined}
    online
    today={TODAY}
    verify={counter.seatscout.verify}
  />
);

const taking = async () => {
  await fireEvent.press(
    await screen.findByRole("button", { name: "Take G6 and G7" }),
  );
};

test("the hand-off sheet, opened and confirmed", async () => {
  const counter = await atTheCounter();

  await measureRenders(drawn(counter), {
    scenario: async () => {
      await taking();
      await screen.findByText(/^Still there/);
    },
  });
});

test("the hand-off sheet's taken verdict and the room's next best", async () => {
  const counter = await atTheCounter();
  counter.roomAtHandOff({ statuses: { G6: "X" } });

  await measureRenders(drawn(counter), {
    scenario: async () => {
      await taking();
      await screen.findByRole("button", { name: "Take F6 and F7" });
    },
  });
});
