/** Calendar days only: the visitor's preferred date is not a booked time. */
export function localCalendarDate(daysAhead = 0, now = new Date()): string {
  const day = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysAhead,
    12,
  );
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

export function preferredDateError(
  value?: string,
  earliest?: string,
): string | null {
  if (!value) return "Choose a date.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    return "Choose a valid calendar date.";
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    year < 1 ||
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return "Choose a valid calendar date.";
  }
  if (earliest && value < earliest) return "Choose today or a later date.";
  return null;
}
