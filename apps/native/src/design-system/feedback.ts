import {
  ImpactFeedbackStyle,
  impactAsync,
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
    void impactAsync(ImpactFeedbackStyle.Medium);
    act();
  };

export const warned = (): void => {
  void notificationAsync(NotificationFeedbackType.Warning);
};
