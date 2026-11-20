export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatPercentBp(bp: number): string {
  return `${String(bp / 100).replace('.', ',')} %`;
}
