export const zł = (cents: number) =>
  (cents / 100).toLocaleString("pl-PL", { style: "currency", currency: "PLN" });
