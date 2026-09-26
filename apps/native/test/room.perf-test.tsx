import { jest, test } from "@jest/globals";
import { labelOf } from "@seatscout/view-logic";
import { openedRooms, WEST_PLANO_28 } from "@seatscout/view-logic/testing";
import { fireEvent, screen } from "@testing-library/react-native";
import { measureRenders } from "reassure";
import { Room } from "../src/room/room.js";
import { still } from "./rooms.js";

jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock"),
);
jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn() }));

const TODAY = "2026-08-28";
const NOW = 13_000;
const STAGE = { x: 0, y: 0, width: 390, height: 760 };

test("the largest room in the corpus, drawn and its choice moved", async () => {
  const [opened] = await openedRooms(undefined, [WEST_PLANO_28]);
  if (opened === undefined) throw new Error("the room was never opened");
  const other = opened.auditorium.offered.find(
    (group) => group.key !== opened.result.key,
  );
  if (other === undefined) throw new Error("the room offers one group");

  await measureRenders(
    <Room
      auditorium={opened.auditorium}
      clock={still(NOW)}
      onBack={() => undefined}
      onHandOff={() => undefined}
      online
      opening={opened.result}
      result={opened.result}
      today={TODAY}
    />,
    {
      scenario: async () => {
        await fireEvent(screen.getByTestId("scroll"), "layout", {
          nativeEvent: { layout: STAGE },
        });
        await fireEvent.press(
          screen.getByRole("radio", {
            name: new RegExp(`^${labelOf(other)} `),
          }),
        );
      },
    },
  );
});
