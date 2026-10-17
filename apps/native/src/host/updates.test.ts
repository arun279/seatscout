import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useLatestUpdate } from "./updates.js";

let mockEnabled = true;
let mockPending = false;
const mockCheck = jest.fn<() => Promise<{ isAvailable: boolean }>>();
const mockFetch = jest.fn<() => Promise<unknown>>();
const mockReload = jest.fn<() => Promise<void>>();

jest.mock("expo-updates", () => ({
  get isEnabled() {
    return mockEnabled;
  },
  useUpdates: () => ({ isUpdatePending: mockPending }),
  checkForUpdateAsync: () => mockCheck(),
  fetchUpdateAsync: () => mockFetch(),
  reloadAsync: () => mockReload(),
}));

const listening = () => {
  const remove = jest.fn();
  const listen = jest
    .spyOn(AppState, "addEventListener")
    .mockClear()
    .mockReturnValue({ remove });
  return { listen, remove };
};

const comeBack = async (
  listen: ReturnType<typeof listening>["listen"],
  state: AppStateStatus = "active",
) => {
  await act(async () => listen.mock.calls[0]?.[1](state));
};

beforeEach(() => {
  mockEnabled = true;
  mockPending = false;
  mockCheck.mockReset().mockResolvedValue({ isAvailable: false });
  mockFetch.mockReset().mockResolvedValue({});
  mockReload.mockReset().mockResolvedValue(undefined);
});

describe("the newest update, applied when nothing would be lost", () => {
  it("runs a downloaded update at once on an empty Search screen", async () => {
    mockPending = true;
    await renderHook(() => useLatestUpdate(true));

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("runs it the moment the download finishes, without waiting for the next launch", async () => {
    const hooked = await renderHook(() => useLatestUpdate(true));
    expect(mockReload).not.toHaveBeenCalled();

    mockPending = true;
    await hooked.rerender(undefined);

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("holds a downloaded update while a search, a room or a hand-off is open, and runs it back on the empty Search screen", async () => {
    mockPending = true;
    const hooked = await renderHook(
      ({ atRest }: { atRest: boolean }) => useLatestUpdate(atRest),
      {
        initialProps: { atRest: false },
      },
    );
    expect(mockReload).not.toHaveBeenCalled();

    await hooked.rerender({ atRest: true });

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("keeps running when the reload fails", async () => {
    mockPending = true;
    mockReload.mockRejectedValue(new Error("not now"));

    await expect(
      renderHook(() => useLatestUpdate(true)),
    ).resolves.toBeDefined();
  });

  it("downloads a newer update when the app comes back to the front", async () => {
    const { listen } = listening();
    mockCheck.mockResolvedValue({ isAvailable: true });
    await renderHook(() => useLatestUpdate(false));

    await comeBack(listen);

    expect(listen).toHaveBeenCalledWith("change", expect.any(Function));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("downloads nothing when no newer update is published", async () => {
    const { listen } = listening();
    await renderHook(() => useLatestUpdate(false));

    await comeBack(listen);

    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("checks nothing when the app only goes to the background", async () => {
    const { listen } = listening();
    await renderHook(() => useLatestUpdate(false));

    await comeBack(listen, "background");

    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("keeps running when the check fails, as it does offline", async () => {
    const { listen } = listening();
    mockCheck.mockRejectedValue(new Error("offline"));
    await renderHook(() => useLatestUpdate(false));

    await expect(comeBack(listen)).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not watch the app at all in a build that takes no updates", async () => {
    const { listen } = listening();
    mockEnabled = false;
    await renderHook(() => useLatestUpdate(false));

    expect(listen).not.toHaveBeenCalled();
  });

  it("stops watching when the app's root goes away", async () => {
    const { remove } = listening();
    const hooked = await renderHook(() => useLatestUpdate(false));

    await hooked.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
