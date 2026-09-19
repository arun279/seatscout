import { twoDigits } from "@seatscout/view-logic";

export const listingDate = (at: Date): string =>
  `${at.getFullYear()}-${twoDigits(at.getMonth() + 1)}-${twoDigits(at.getDate())}`;

export const dateAt = (listing: string): Date =>
  new Date(
    Number(listing.slice(0, 4)),
    Number(listing.slice(5, 7)) - 1,
    Number(listing.slice(8, 10)),
  );

export const today = (): string => listingDate(new Date());
