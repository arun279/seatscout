import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import { useWindowDimensions } from "react-native";

const TextSize = createContext(1);

export const TextSizeProvider = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => (
  <TextSize value={useWindowDimensions().fontScale}>{children}</TextSize>
);

export const useTextSize = (): number => useContext(TextSize);

const LARGEST_STANDARD_SIZE = 1.353;

export const useLargeText = (): boolean =>
  useTextSize() > LARGEST_STANDARD_SIZE;
