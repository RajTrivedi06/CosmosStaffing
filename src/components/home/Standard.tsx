import { home } from "@/lib/site";
import { Placeholder } from "@/components/ui/Placeholder";

/** 14:00. A visible checklist convinces more than "high quality" ever can. */
export function Standard() {
  const { standard } = home;

  return (
    <section
      className="chapter pad"
      data-time="14:00"
      data-bg="#f6ecdd"
      aria-labelledby="std-h"
    >
      <div className="two">
        <div className="stack">
          <h2 id="std-h">{standard.title}</h2>
          <p className="lede">
            {standard.lede}{" "}
            <Placeholder>to confirm: {standard.ledeConfirm}</Placeholder>
          </p>
        </div>
        <div className="checklist" id="checklist">
          <div className="head">
            <h3>{standard.checklistTitle}</h3>
            <span>
              <Placeholder>1 of 8 rooms</Placeholder>
            </span>
          </div>
          <ul>
            {standard.checklist.map((item) => (
              <li key={item}>
                <svg className="tick" viewBox="0 0 22 22" aria-hidden="true">
                  <circle cx="11" cy="11" r="10" />
                  <path d="M6.5 11.4l3 3 6-6.6" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="points">
        {standard.points.map((point) => (
          <div key={point.title}>
            <h3>{point.title}</h3>
            <p>
              {"confirm" in point && point.confirm ? (
                <Placeholder>to confirm: {point.body}</Placeholder>
              ) : (
                point.body
              )}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
