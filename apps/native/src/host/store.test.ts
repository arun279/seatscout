import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { type CachedCatalogue, storeContract } from "@seatscout/client";
import { deviceStore } from "./store.js";

const REMEMBERED: CachedCatalogue = {
  fetchedAt: 1,
  catalogue: { bookable: [], unbookable: [], unidentified: [] },
};

const REMEMBERED_TEXT =
  '{"fetchedAt":1,"catalogue":{"bookable":[],"unbookable":[],"unidentified":[]}}';

const failing = async () =>
  (await storeContract(deviceStore))
    .filter((check) => check.failure !== null)
    .map((check) => check.failure);

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the store this phone keeps", () => {
  it("satisfies the store contract, and writes through to the phone's own storage", async () => {
    expect(await failing()).toEqual([]);
    expect(await AsyncStorage.getItem("written")).toBe(REMEMBERED_TEXT);
  });

  it("reads a value the storage no longer holds whole as absent", async () => {
    await AsyncStorage.setItem("mangled", "half a catalo");

    expect(await deviceStore.read("mangled")).toBeUndefined();
  });

  it("reads as absent where the storage refuses to answer at all", async () => {
    await deviceStore.write("refused", REMEMBERED);
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("the database is locked"));

    expect(await deviceStore.read("refused")).toBeUndefined();
  });

  it("drops a write the storage refuses and keeps answering", async () => {
    await deviceStore.write("held", REMEMBERED);
    jest
      .spyOn(AsyncStorage, "setItem")
      .mockRejectedValueOnce(new Error("the disk is full"));
    await deviceStore.write("held", { ...REMEMBERED, fetchedAt: 2 });

    expect(await deviceStore.read("held")).toEqual(REMEMBERED);
  });
});
