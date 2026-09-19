import { Stack } from "expo-router";
import type { ReactElement } from "react";

export default function Layout(): ReactElement {
  return <Stack screenOptions={{ title: "SeatScout" }} />;
}
