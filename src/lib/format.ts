export const formatSigned = (value: number, digits = 2) =>
  `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;

export const formatScore = (value: number) => Math.round(value).toString();
