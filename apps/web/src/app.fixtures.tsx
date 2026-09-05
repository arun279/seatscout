import { screen, within } from "@testing-library/react";

export const ask = () =>
  within(screen.getByRole("dialog", { name: /what are we seeing/i }));
