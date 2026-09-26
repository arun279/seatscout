import {
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from "expo-haptics";

export const felt =
  <Given extends readonly unknown[]>(
    act: (...given: Given) => void,
  ): ((...given: Given) => void) =>
  (...given) => {
    void selectionAsync();
    act(...given);
  };

export const committed =
  (act: () => void): (() => void) =>
  () => {
    void notificationAsync(NotificationFeedbackType.Success);
    act();
  };
