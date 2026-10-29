import type { FaqItem } from "@/lib/site";
import { Placeholder } from "./Placeholder";

/**
 * Questions as native disclosure widgets. An answer marked `confirm` states a
 * policy that is not approved yet, so it renders as a placeholder for review.
 */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>
            {"confirm" in item && item.confirm ? (
              <Placeholder>to confirm: {item.a}</Placeholder>
            ) : (
              item.a
            )}
          </p>
        </details>
      ))}
    </div>
  );
}
