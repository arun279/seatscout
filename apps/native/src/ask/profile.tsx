import { isReference, REFERENCE, type SeatProfile } from "@seatscout/client";
import {
  aimAt,
  aimOf,
  DEPTH,
  depthOf,
  LATERAL,
  marksOf,
  mindOf,
  SEAT_PICKER,
  SITTING,
  WEIGHT,
  WEIGHTS,
} from "@seatscout/view-logic";
import { type ReactElement, useState } from "react";
import { type GestureResponderEvent, StyleSheet, View } from "react-native";
import { Ghost } from "../design-system/button.js";
import { Section } from "../design-system/field.js";
import { Range } from "../design-system/range.js";
import { TOUCH_FLOOR } from "../design-system/touch.js";
import { PLAN_ACROSS, PlanDrawing } from "../design-system/room-plan.js";
import { Type } from "../design-system/type.js";
import { useTheme } from "../theme.js";

export interface ProfileProps {
  readonly profile: SeatProfile;
  readonly onChange: (profile: SeatProfile) => void;
  readonly onHolding: (holding: boolean) => void;
}

const styles = StyleSheet.create({
  picker: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  ends: { flexDirection: "row", justifyContent: "space-between" },
});

const SeatPicker = ({ profile, onChange, onHolding }: ProfileProps) => {
  const { colours } = useTheme();
  const [across, setAcross] = useState(0);
  const sitting = {
    depth: profile.targetDepth,
    lateral: profile.targetLateral,
    seatsOffCentre: 0,
  };
  const scale = across / PLAN_ACROSS;
  const place = ({ nativeEvent }: GestureResponderEvent) =>
    onChange({
      ...profile,
      ...aimAt({
        cx: nativeEvent.locationX / scale,
        cy: nativeEvent.locationY / scale,
      }),
    });
  const onTheDot = ({ nativeEvent }: GestureResponderEvent) => {
    const { cx, cy } = marksOf(SEAT_PICKER, sitting, profile).target;
    return (
      Math.hypot(
        nativeEvent.locationX - cx * scale,
        nativeEvent.locationY - cy * scale,
      ) <= TOUCH_FLOOR
    );
  };

  return (
    <View
      style={[
        styles.picker,
        { backgroundColor: colours.houseDeep, borderColor: colours.hairline },
      ]}
    >
      <View
        onLayout={({ nativeEvent }) => setAcross(nativeEvent.layout.width)}
        onResponderGrant={(touch) => {
          onHolding(true);
          place(touch);
        }}
        onResponderMove={place}
        onResponderRelease={() => onHolding(false)}
        onResponderTerminate={() => onHolding(false)}
        onResponderTerminationRequest={() => false}
        onStartShouldSetResponder={onTheDot}
        testID="seat-picker"
      >
        <PlanDrawing
          across={across}
          plan={SEAT_PICKER}
          position={sitting}
          target={profile}
          was={isReference(profile) ? undefined : REFERENCE}
        />
      </View>
    </View>
  );
};

export const Profile = ({
  profile,
  onChange,
  onHolding,
}: ProfileProps): ReactElement => (
  <>
    <Section label={SITTING.heading}>
      <SeatPicker onChange={onChange} onHolding={onHolding} profile={profile} />
      <Type set="sentenceSmall" tone="silverFaint">
        {SITTING.drag}
      </Type>
      <Range
        ends={SITTING.depthEnds}
        label={SITTING.depth}
        onChange={(targetDepth) => onChange({ ...profile, targetDepth })}
        said={depthOf(profile.targetDepth)}
        scale={DEPTH}
        value={profile.targetDepth}
      />
      <Range
        ends={SITTING.lateralEnds}
        label={SITTING.lateral}
        onChange={(targetLateral) => onChange({ ...profile, targetLateral })}
        said={aimOf(profile.targetLateral)}
        scale={LATERAL}
        value={profile.targetLateral}
      />
      <Ghost
        label={SITTING.reference}
        onPress={isReference(profile) ? undefined : () => onChange(REFERENCE)}
      />
      <Type set="sentenceSmall" tone="silverFaint">
        {SITTING.referenceNote}
      </Type>
    </Section>
    <Section label={SITTING.minding}>
      {WEIGHTS.map(({ field, label }) => (
        <Range
          key={field}
          label={label}
          onChange={(weight) => onChange({ ...profile, [field]: weight })}
          said={mindOf(profile[field])}
          scale={WEIGHT}
          value={profile[field]}
        />
      ))}
      <View style={styles.ends}>
        <Type set="ledgerLabel" tone="silverFaint">
          {SITTING.mindEnds[0]}
        </Type>
        <Type set="ledgerLabel" tone="silverFaint">
          {SITTING.mindEnds[1]}
        </Type>
      </View>
    </Section>
  </>
);
