import { getCalendars } from "expo-localization";

const SUNDAY = 1;

export const firstWeekday = (): number =>
  (getCalendars()[0]?.firstWeekday ?? SUNDAY) - SUNDAY;
