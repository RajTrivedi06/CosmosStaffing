import type { QuoteAnswers } from "@/lib/quote";

/** Name, email and phone on their own lines, so none breaks mid-word. */
export function ContactLines({ answers }: { answers: QuoteAnswers }) {
  return (
    <span className="contact-lines">
      {[answers.name, answers.email, answers.phone]
        .filter(Boolean)
        .map((line, i) => (
          <span key={i}>{line}</span>
        ))}
    </span>
  );
}
