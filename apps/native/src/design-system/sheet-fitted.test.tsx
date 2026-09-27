import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { Sheet } from "./sheet.js";

const flexOf = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props["style"])?.flex;

const presented = (fitted?: true) =>
  render(
    <Sheet
      claimed
      dock={null}
      {...(fitted && { fitted })}
      heading="Hooky Entertainment Addison + SDX"
      keep="Back to the list"
      onKeep={() => undefined}
    >
      {null}
    </Sheet>,
  );

describe("the height a sheet takes", () => {
  it("fills the height the platform gives it", async () => {
    await presented();

    expect([flexOf("stage"), flexOf("sheet-body")]).toEqual([1, 1]);
  });

  it("takes only the height of what it holds when it is asked to fit it", async () => {
    await presented(true);

    expect([flexOf("stage"), flexOf("sheet-body")]).toEqual([
      undefined,
      undefined,
    ]);
  });
});
