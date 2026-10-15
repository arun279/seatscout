import type { SeatProfile, SeatScout } from "@seatscout/client";
import type { RawTerms, Term, Terms } from "@seatscout/view-logic";
import {
  ASKING,
  chosenFrom,
  costOf,
  knownFilms,
  ledeOf,
  nextOf,
  nextStepOf,
  programmeNear,
  termsOf,
  titleOf,
} from "@seatscout/view-logic";
import {
  type ReactElement,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { TextInput } from "react-native";
import { StyleSheet } from "react-native";
import { Velvet } from "../design-system/button.js";
import { focusOn } from "../design-system/field.js";
import { Sheet } from "../design-system/sheet.js";
import { Type } from "../design-system/type.js";
import { Editor } from "./editors.js";

export interface AskProps {
  readonly seatscout: SeatScout;
  readonly terms: Terms;
  readonly profile: SeatProfile;
  readonly today: string;
  readonly focus: Term | undefined;
  readonly onKeep: () => void;
  readonly onFind: (terms: Terms, profile: SeatProfile) => void;
}

const styles = StyleSheet.create({
  said: { textAlign: "center" },
});

const areaOf = ({ area = "" }: Terms) => area.trim() || undefined;

export const Ask = ({
  seatscout,
  terms,
  profile: chosen,
  today,
  focus,
  onKeep,
  onFind,
}: AskProps): ReactElement => {
  const [editing, setEditing] = useState(focus ?? nextOf(terms) ?? "area");
  const [draft, setDraft] = useState(terms);
  const [profile, setProfile] = useState(chosen);
  const [held, setHeld] = useState(() =>
    programmeNear(seatscout, areaOf(terms), terms.date),
  );
  const playing = useSyncExternalStore(held.subscribe, held.snapshot);
  const [typed, setTyped] = useState<string>();
  const [holding, setHolding] = useState(false);
  const field = useRef<TextInput>(null);
  const films = knownFilms(playing.movies, terms);
  const film = typed ?? titleOf(films, terms.movie) ?? terms.movie ?? "";
  const asked = termsOf({ ...draft, ...chosenFrom(film, films) }, today);
  const next = nextOf(asked);
  const lede = ledeOf(asked);
  const cost = costOf(draft, today);

  const settle = (change: RawTerms) => {
    const settled = termsOf({ ...draft, ...change }, today);
    setDraft(settled);
    return settled;
  };

  const follow = (now: Terms) => {
    const area = areaOf(now);
    if (held.area !== area || held.date !== now.date)
      setHeld(programmeNear(seatscout, area, now.date));
  };

  const step = () => {
    if (next === undefined) onFind(asked, profile);
    else if (next === editing) focusOn(field);
    else {
      follow(asked);
      setEditing(next);
    }
  };

  return (
    <Sheet
      claimed={
        editing === "area" || (editing === "movie" && held.area !== undefined)
      }
      dock={
        <>
          {lede !== undefined && (
            <Type set="sentenceDock" tone="silverDim">
              {lede}
            </Type>
          )}
          <Velvet label={nextStepOf(asked)} onPress={step} />
          {cost !== undefined && (
            <Type
              set="sentenceSmall"
              style={styles.said}
              testID="cost"
              tone="silverDim"
            >
              {cost}
            </Type>
          )}
          <Type set="sentenceSmall" style={styles.said} tone="silverFaint">
            {ASKING.kept}
          </Type>
        </>
      }
      heading={ASKING.headings[editing]}
      keep={ASKING.keep}
      key={editing}
      onKeep={onKeep}
      scrolls={!holding}
    >
      <Editor
        area={held.area}
        draft={draft}
        editing={editing}
        field={field}
        film={film}
        onChange={(change) => setDraft({ ...draft, ...change })}
        onFollow={follow}
        onHolding={setHolding}
        onProfile={setProfile}
        onSettle={settle}
        onTyped={setTyped}
        playing={playing}
        profile={profile}
        today={today}
      />
    </Sheet>
  );
};
