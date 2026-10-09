import {
  createContext,
  type ReactElement,
  type ReactNode,
  useContext,
} from "react";
import { useWindowDimensions } from "react-native";

const TextSize = createContext(1);

export const FollowingTheTextSize = ({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement => (
  <TextSize value={useWindowDimensions().fontScale}>{children}</TextSize>
);

export const useTextSize = (): number => useContext(TextSize);
