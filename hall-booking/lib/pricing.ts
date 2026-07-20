export const PURPOSES = [
  { key: "wedding",  label: "💍 Wedding Muhurtham", rate: 35000 },
  { key: "reception", label: "🎉 Reception",         rate: 25000 },
  { key: "family",   label: "👨‍👩‍👧‍👦 Family Function",  rate: 18000 },
  { key: "puberty",  label: "🌸 Puberty Function",   rate: 15000 },
] as const;

export type PurposeKey = (typeof PURPOSES)[number]["key"];

export const DEPOSIT = 5000;

export function getRate(purposeKey: string): number {
  return PURPOSES.find((p) => p.key === purposeKey)?.rate ?? 25000;
}

export function getTotal(purposeKey: string): number {
  return getRate(purposeKey) + DEPOSIT;
}

export function generateBookingRef(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MHL-${year}-${rand}`;
}
