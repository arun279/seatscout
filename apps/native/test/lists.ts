import { act } from "@testing-library/react-native";

const VIRTUALIZED_LIST_BATCH_MS = 50;

export const listDrawn = (): Promise<void> =>
  act(
    () =>
      new Promise<void>((done) => {
        setTimeout(done, VIRTUALIZED_LIST_BATCH_MS);
      }),
  );
