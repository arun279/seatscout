import { jest } from "@jest/globals";
import {
  type ComponentType,
  createElement,
  useMemo,
  useReducer,
  useRef,
} from "react";

const useSharedValue = <T>(initial: T): { value: T } => {
  const held = useRef(initial);
  const [, redraw] = useReducer((drawn: number) => drawn + 1, 0);
  return useMemo(
    () => ({
      get value() {
        return held.current;
      },
      set value(next: T) {
        held.current = next;
        redraw();
      },
    }),
    [],
  );
};

type Props = Readonly<Record<string, unknown>>;

const animated = new Map<string, Props>();

export const animatedTo = (testID: string): Props | undefined =>
  animated.get(testID);

const createAnimatedComponent =
  (Drawn: ComponentType<Props>) =>
  ({ animatedProps, ...props }: Props & { readonly animatedProps?: Props }) => {
    const testID = props["testID"];
    if (typeof testID === "string" && animatedProps !== undefined)
      animated.set(testID, animatedProps);
    return createElement(Drawn, props);
  };

export const onTheJsThread = (): object => {
  const mock = jest.requireActual<{ default: object }>(
    "react-native-reanimated/mock",
  );
  return {
    ...mock,
    useSharedValue,
    createAnimatedComponent,
    default: { ...mock.default, createAnimatedComponent },
  };
};
