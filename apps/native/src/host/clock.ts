import { twoDigits } from "@seatscout/view-logic";

export const listingDate = (at: Date): string =>
  `${at.getFullYear()}-${twoDigits(at.getMonth() + 1)}-${twoDigits(at.getDate())}`;

export const today = (): string => listingDate(new Date());
