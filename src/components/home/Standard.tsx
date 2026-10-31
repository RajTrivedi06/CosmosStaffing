import { home } from "@/lib/site";

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
          <p className="lede">{standard.lede}</p>
        </div>
        <div className="checklist" id="checklist">
          <div className="head">
            <h3>{standard.checklistTitle}</h3>
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
          <p className="micro">{standard.confirm}</p>
        </div>
      </div>
    </section>
  );
}
