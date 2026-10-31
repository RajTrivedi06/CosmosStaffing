import type { FaqItem } from "@/lib/site";
/** Questions as native disclosure widgets. */
export function FaqList({ items }: { items: readonly FaqItem[] }) {
  return (
    <div className="faq">
      {items.map((item) => (
        <details key={item.q}>
          <summary>{item.q}</summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
