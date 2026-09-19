import AsyncStorage from "@react-native-async-storage/async-storage";
import type { KeyValueStore } from "@seatscout/client";

export const deviceStore: KeyValueStore = {
  read: async (key) => {
    try {
      const text = await AsyncStorage.getItem(key);
      return text === null ? undefined : JSON.parse(text);
    } catch {}
  },
  write: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
};
