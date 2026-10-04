import type { TicketingUrl } from "@seatscout/client";
import { openBrowserAsync } from "expo-web-browser";

export type Checkout = (ticketing: TicketingUrl) => Promise<void>;

export const inAppBrowser: Checkout = async (ticketing) => {
  await openBrowserAsync(ticketing);
};
