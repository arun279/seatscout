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

describe("the newest update, applied when the app is opened", () => {
  it("runs a downloaded update at once instead of on the next launch", async () => {
    mockPending = true;
    await renderHook(() => useLatestUpdate());

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("leaves the running app alone while nothing is downloaded", async () => {
    await renderHook(() => useLatestUpdate());

    expect(mockReload).not.toHaveBeenCalled();
  });

  it("downloads a newer update when the app comes back to the front", async () => {
    const { listen } = listening();
    mockCheck.mockResolvedValue({ isAvailable: true });
    await renderHook(() => useLatestUpdate());

    await comeBack(listen);

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("downloads nothing when no newer update is published", async () => {
    const { listen } = listening();
    await renderHook(() => useLatestUpdate());

    await comeBack(listen);

    expect(mockCheck).toHaveBeenCalledTimes(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("checks nothing when the app only goes to the background", async () => {
    const { listen } = listening();
    await renderHook(() => useLatestUpdate());

    await comeBack(listen, "background");

    expect(mockCheck).not.toHaveBeenCalled();
  });

  it("keeps running when the check fails, as it does offline", async () => {
    const { listen } = listening();
    mockCheck.mockRejectedValue(new Error("offline"));
    await renderHook(() => useLatestUpdate());

    await expect(comeBack(listen)).resolves.toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not watch the app at all in a build that takes no updates", async () => {
    const { listen } = listening();
    mockEnabled = false;
    await renderHook(() => useLatestUpdate());

    expect(listen).not.toHaveBeenCalled();
  });

  it("stops watching when the app's root goes away", async () => {
    const { remove } = listening();
    const hooked = await renderHook(() => useLatestUpdate());

    await hooked.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});
