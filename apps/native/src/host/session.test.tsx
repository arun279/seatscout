import { describe, expect, it } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { phone } from "../../test/phone.js";
import { ASKED } from "../../test/rooms.js";
import { useSession } from "./session.js";

const { seatscout } = phone([], { script: {} });

const held = (asked = ASKED) => renderHook(() => useSession(seatscout, asked));

describe("the search a screen holds", () => {
  it("is the search another screen already holds for the same Query", async () => {
    const list = await held();
    const room = await held({ ...ASKED });

    expect(room.result.current).toBe(list.result.current);
  });

  it("is a search of its own for a different Query", async () => {
    const list = await held();
    const other = await held({ ...ASKED, partySize: 4 });

    expect(other.result.current).not.toBe(list.result.current);
  });

  it("is a new search once every screen that held the Query has let it go", async () => {
    const list = await held();
    const room = await held();
    const before = list.result.current;

    await room.unmount();
    await list.unmount();
    const again = await held();

    expect(again.result.current).not.toBe(before);
  });

  it("is still held after the screen holding it draws again", async () => {
    const list = await held();

    await list.rerender({});
    const room = await held();

    expect(room.result.current).toBe(list.result.current);
  });

  it("is still shared while one screen holds it after another lets go", async () => {
    const list = await held();
    const room = await held();

    await room.unmount();
    const again = await held();

    expect(again.result.current).toBe(list.result.current);
  });
});
