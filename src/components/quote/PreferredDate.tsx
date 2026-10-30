"use client";

import { useId } from "react";
import { localCalendarDate } from "@/lib/quote-date";
import styles from "./QuoteFlow.module.css";

/** Keep the device's accessible date picker instead of introducing a custom calendar. */
export function PreferredDate({
  value,
  onChange,
  error,
  errorId,
}: {
  value?: string;
  onChange: (date: string) => void;
  error: boolean;
  errorId: string;
}) {
  const id = useId();
  return (
    <div className="quote-date">
      <label className="quote-label" htmlFor={id}>
        Preferred start date
      </label>
      <input
        id={id}
        className="input quote-input"
        type="date"
        required
        min={localCalendarDate()}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={`${id}-hint${error ? ` ${errorId}` : ""}`}
      />
      <div
        className={styles.dateShortcuts}
        role="group"
        aria-label="Suggested dates"
      >
        {[
          { days: 1, label: "Tomorrow" },
          { days: 7, label: "In one week" },
        ].map(({ days, label }) => (
          <button
            key={days}
            type="button"
            className="btn btn-glass"
            aria-pressed={value === localCalendarDate(days)}
            onClick={() => onChange(localCalendarDate(days))}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="quote-note" id={`${id}-hint`}>
        This is your preferred date. We&apos;ll confirm availability before
        anything is booked.
      </p>
    </div>
  );
}
