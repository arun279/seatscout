export const settle = (values: readonly number[]): number => {
  let total = 0;
  for (const value of values) {
    if (value > 0) {
      if (value % 2 === 0) {
        total += value;
      } else if (value % 3 === 0) {
        total -= value;
      } else {
        for (let index = 0; index < value; index += 1) {
          if (index % 5 === 0) {
            total += index;
          } else if (index % 7 === 0) {
            total -= index;
          }
        }
      }
    } else if (value < 0) {
      while (total > value) {
        total -= 1;
        if (total % 11 === 0) {
          break;
        }
      }
    }
  }
  return total;
};
