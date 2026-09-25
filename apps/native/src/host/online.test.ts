import { describe, expect, it, jest } from "@jest/globals";
import { renderHook } from "@testing-library/react-native";
import { useOnline } from "./online.js";

interface Network {
  readonly isConnected?: boolean | undefined;
  readonly isInternetReachable?: boolean | undefined;
}

const mockNetwork = jest.fn<() => Network>();

jest.mock("expo-network", () => ({ useNetworkState: () => mockNetwork() }));

const reading = async (state: Network) => {
  mockNetwork.mockReturnValue(state);
  const reached = await renderHook(() => useOnline());
  return reached.result.current;
};

describe("whether the phone can reach anything", () => {
  it("takes the phone's word that the internet is reachable", async () => {
    expect(
      await reading({ isConnected: true, isInternetReachable: true }),
    ).toBe(true);
  });

  it("takes its word that it is not, even on a connection of some kind", async () => {
    expect(
      await reading({ isConnected: true, isInternetReachable: false }),
    ).toBe(false);
  });

  it("falls back to the connection itself while reachability is unknown", async () => {
    expect(await reading({ isConnected: false })).toBe(false);
  });

  it("assumes a connection before the phone has said anything, because a banner nobody needs is the worse mistake", async () => {
    expect(await reading({})).toBe(true);
  });
});
