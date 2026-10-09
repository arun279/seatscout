import { type MenuAction, MenuView } from "@expo/ui/community/menu";
import type { ReactElement } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useTheme } from "../theme.js";
import { felt } from "./feedback.js";
import { type TermMenuProps, Token, TokenFace } from "./token.js";

const MORE = "more";

type TermMenuOf = <Value>(props: TermMenuProps<Value>) => ReactElement;

const PlatformMenu: TermMenuOf = ({
  choices,
  more,
  onChoose,
  onMore,
  ...face
}) => {
  const { appearance } = useTheme();
  const { fontScale } = useWindowDimensions();
  const actions: MenuAction[] = [
    ...choices.map(
      ({ text, chosen }, at): MenuAction => ({
        id: `${at}`,
        title: text,
        state: chosen ? "on" : "off",
      }),
    ),
    {
      id: MORE,
      title: "",
      displayInline: true,
      subactions: [{ id: MORE, title: more }],
    },
  ];
  const choose = felt(onChoose);

  return (
    <MenuView
      actions={actions}
      colorScheme={appearance === "down" ? "dark" : "light"}
      key={fontScale}
      onPressAction={({ nativeEvent }) => {
        const chosen = choices[Number(nativeEvent.event)];
        if (chosen !== undefined) choose(chosen.value);
        else if (nativeEvent.event === MORE) onMore();
      }}
      testID={`menu ${face.words}`}
    >
      <TokenFace {...face} menu />
    </MenuView>
  );
};

const AskInstead: TermMenuOf = ({ words, set, tone, onMore }) => (
  <Token menu onPress={onMore} set={set} tone={tone} words={words} />
);

export const termMenuFor = (os: typeof Platform.OS): TermMenuOf =>
  os === "web" ? AskInstead : PlatformMenu;

export const TermMenu: TermMenuOf = termMenuFor(Platform.OS);
