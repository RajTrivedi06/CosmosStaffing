/**
 * Renders a visible, obvious `[PLACEHOLDER: …]` token as an accent pill.
 * Per the content rules, these must stay in place — never swap them for
 * invented values.
 *
 *   <Placeholder>one business day</Placeholder>  ->  [PLACEHOLDER: one business day]
 */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return <span className="ph">[PLACEHOLDER: {children}]</span>;
}
