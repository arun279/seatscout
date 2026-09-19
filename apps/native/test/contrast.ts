export const READS_AT = 4.5;

const WEIGHTS = [0.2126, 0.7152, 0.0722];

const channelAt = (hex: string, index: number) => {
  const value =
    Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) =>
  WEIGHTS.reduce(
    (total, weight, index) => total + weight * channelAt(hex, index),
    0,
  );

export const contrastOf = (one: string, other: string): number => {
  const first = luminance(one);
  const second = luminance(other);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
};
