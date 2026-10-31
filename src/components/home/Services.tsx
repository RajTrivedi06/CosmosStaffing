import Link from "next/link";
import { home, images, services } from "@/lib/site";
import { Frame } from "./Frame";
import { ServicePicker } from "./ServicePicker";

/** 11:00. Each card is a different space and starts its own quote. */
export function Services() {
  return (
    <section
      className="chapter pad"
      id="services"
      data-time="11:00"
      data-bg="#f6f3ea"
      aria-labelledby="svc-h"
    >
      <h2 id="svc-h">{home.services.title}</h2>
      <div className="services">
        {services.map((item) => (
          <Link
            key={item.id}
            className="svc"
            href={`/quote?service=${item.id}`}
          >
            <Frame
              image={images[item.image]}
              alt={item.alt}
              sizes="(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 25vw"
              objectPosition={item.image === "office" ? "72% 50%" : undefined}
            />
            <h3>{item.title}</h3>
            <p>{item.short}</p>
            <div className="row">
              <span className="go">{home.services.go}</span>
            </div>
          </Link>
        ))}
      </div>
      <ServicePicker />
      <Link className="btn btn-quiet more-link" href="/services">
        {home.services.more}
      </Link>
    </section>
  );
}
