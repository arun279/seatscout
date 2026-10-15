import { screen, within } from "@testing-library/react-native";

export const buttonsIn = (testID: string): readonly string[] =>
  within(screen.getByTestId(testID))
    .getAllByRole("button")
    .map((button) => String(button.props["accessibilityLabel"]));
