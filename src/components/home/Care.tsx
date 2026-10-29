import { home, images } from "@/lib/site";
import { Frame } from "./Frame";

/** 15:30. Speaks to the fear of damage to things people value. */
export function Care() {
  return (
    <section
      className="chapter pad"
      data-time="15:30"
      data-bg="#f4e6d2"
      aria-labelledby="care-h"
    >
      <div className="two">
        <div className="stack">
          <h2 id="care-h">{home.care.title}</h2>
          <p className="lede">{home.care.lede}</p>
          <ul className="care">
            {home.care.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <Frame
          image={images.kintsugi}
          alt={home.care.alt}
          sizes="(max-width: 860px) 100vw, 45vw"
        />
      </div>
    </section>
  );
}
