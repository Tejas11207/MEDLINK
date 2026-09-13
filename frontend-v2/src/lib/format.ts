export function formatEnum(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
