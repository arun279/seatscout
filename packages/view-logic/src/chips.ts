export const toggled = <Named extends string>(
  every: readonly Named[],
  chosen: readonly Named[] | undefined,
  value: Named,
): readonly Named[] => {
  const pressed = new Set(chosen);
  if (pressed.has(value)) pressed.delete(value);
  else pressed.add(value);
  return every.filter((named) => pressed.has(named));
};
