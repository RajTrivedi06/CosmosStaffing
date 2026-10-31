"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { home, images, PHOTO_QUALITY, services } from "@/lib/site";
import { scrollToY } from "@/lib/scroll";

const STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};
const LAST = services.length - 1;
/** Sideways travel, in pixels, that counts as a swipe or a trackpad flick. */
const SWIPE = 40;
/** A trackpad keeps sending momentum; one flick moves one card. */
const FLICK_MS = 600;
/** Above this page scale the customer has pinched in. */
const ZOOMED = 1.01;

/**
 * Phones: the services as a reel. Scrolling down pins the section and
 * carries the full-photo cards past one by one; the card in place is the
 * selected service, and the one "Get a quote" button below starts a quote
 * for it. Tapping a card, the arrow keys, or swiping sideways scrolls the page
 * to it, so vertical scrolling and pinch zoom stay the browser's and there's
 * one position.
 *
 * Under reduced motion the row is a native swipe instead, and selection
 * follows the card that comes to rest. Without JavaScript the linked grid
 * in <Services> shows instead (see globals.css).
 */
export function ServicePicker() {
  const [selected, setSelected] = useState(0);
  const selectedRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);
  /** Moves the reel (or the swipe row) to a card; set by the active mode. */
  const goToRef = useRef<(index: number) => void>(() => {});
  const item = services[selected];

  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;
    gsap.registerPlugin(ScrollTrigger);

    const choose = (index: number) => {
      if (index === selectedRef.current) return;
      selectedRef.current = index;
      setSelected(index);
    };
    const offset = (index: number) =>
      (cardsRef.current[index]?.offsetLeft ?? 0) -
      (cardsRef.current[0]?.offsetLeft ?? 0);

    const mm = gsap.matchMedia();
    mm.add(
      "(max-width: 760px) and (prefers-reduced-motion: no-preference)",
      () => {
        const tween = gsap.to(track, {
          x: () => -offset(LAST),
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => choose(Math.round(self.progress * LAST)),
          },
        });
        goToRef.current = (index) => {
          const st = tween.scrollTrigger;
          if (st) scrollToY(st.start + ((st.end - st.start) * index) / LAST);
        };

        const step = (direction: number) => {
          const next = selectedRef.current + direction;
          if (next >= 0 && next <= LAST) goToRef.current(next);
        };
        // Pinching and moving around a magnified page stay the browser's: the
        // cards take a swipe only from one finger at normal scale.
        const zoomed = () => (window.visualViewport?.scale ?? 1) > ZOOMED;
        const onViewport = () => {
          track.toggleAttribute("data-zoomed", zoomed());
        };
        let touch: { x: number; y: number } | null = null;
        const onTouchStart = (event: TouchEvent) => {
          const [first] = event.touches;
          touch =
            event.touches.length === 1 && !zoomed()
              ? { x: first.clientX, y: first.clientY }
              : null;
        };
        // The second finger can land off the cards, where touchstart can't see it.
        const onTouchMove = (event: TouchEvent) => {
          if (event.touches.length > 1) touch = null;
        };
        const onTouchEnd = (event: TouchEvent) => {
          const [last] = event.changedTouches;
          if (!touch || !last) return;
          const dx = last.clientX - touch.x;
          const dy = last.clientY - touch.y;
          touch = null;
          if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(dy))
            step(dx < 0 ? 1 : -1);
        };
        let travel = 0;
        let flickedAt = -Infinity;
        const onWheel = (event: WheelEvent) => {
          if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
          if (event.timeStamp - flickedAt < FLICK_MS) return;
          travel += event.deltaX;
          if (Math.abs(travel) < SWIPE) return;
          step(travel > 0 ? 1 : -1);
          travel = 0;
          flickedAt = event.timeStamp;
        };
        track.addEventListener("touchstart", onTouchStart, { passive: true });
        track.addEventListener("touchmove", onTouchMove, { passive: true });
        track.addEventListener("touchend", onTouchEnd, { passive: true });
        track.addEventListener("wheel", onWheel, { passive: true });
        window.visualViewport?.addEventListener("resize", onViewport);
        return () => {
          track.removeEventListener("touchstart", onTouchStart);
          track.removeEventListener("touchmove", onTouchMove);
          track.removeEventListener("touchend", onTouchEnd);
          track.removeEventListener("wheel", onWheel);
          window.visualViewport?.removeEventListener("resize", onViewport);
          track.removeAttribute("data-zoomed");
        };
      },
    );
    mm.add("(max-width: 760px) and (prefers-reduced-motion: reduce)", () => {
      let timer: ReturnType<typeof setTimeout>;
      const settle = () => {
        clearTimeout(timer);
        const left = track.scrollLeft;
        let nearest = 0;
        for (let i = 1; i <= LAST; i++) {
          if (Math.abs(offset(i) - left) < Math.abs(offset(nearest) - left)) {
            nearest = i;
          }
        }
        choose(nearest);
      };
      const onScroll = () => {
        clearTimeout(timer);
        timer = setTimeout(settle, 150);
      };
      track.addEventListener("scroll", onScroll, { passive: true });
      track.addEventListener("scrollend", settle);
      goToRef.current = (index) => {
        choose(index);
        track.scrollTo({ left: offset(index), behavior: "instant" });
      };
      return () => {
        clearTimeout(timer);
        track.removeEventListener("scroll", onScroll);
        track.removeEventListener("scrollend", settle);
      };
    });
    return () => mm.revert();
  }, []);

  const go = (index: number, focus = false) => {
    const next = Math.max(0, Math.min(LAST, index));
    if (focus) cardsRef.current[next]?.focus({ preventScroll: true });
    goToRef.current(next);
  };

  return (
    <div className="service-picker" ref={rootRef}>
      <div className="reel-stage">
        <div
          className="service-picker-cards"
          ref={trackRef}
          role="radiogroup"
          aria-label={home.services.choose}
          data-lenis-prevent-horizontal
        >
          {services.map((service, index) => (
            <button
              key={service.id}
              ref={(card) => {
                cardsRef.current[index] = card;
              }}
              type="button"
              className="service-picker-card"
              role="radio"
              aria-checked={selected === index}
              aria-labelledby={`service-picker-${service.id}`}
              tabIndex={selected === index ? 0 : -1}
              onClick={() => go(index, true)}
              onKeyDown={(event) => {
                const step = STEPS[event.key];
                if (!step) return;
                event.preventDefault();
                go(selectedRef.current + step, true);
              }}
            >
              <Image
                src={images[service.image].src}
                alt={service.alt}
                fill
                sizes="90vw"
                quality={PHOTO_QUALITY}
                style={{
                  objectPosition:
                    service.image === "office" ? "72% 50%" : undefined,
                }}
              />
              <span className="reel-caption">
                <span className="reel-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")} /{" "}
                  {String(services.length).padStart(2, "0")}
                </span>
                <span
                  className="service-picker-title"
                  id={`service-picker-${service.id}`}
                >
                  {service.title}
                </span>
                <span className="reel-short">{service.short}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="reel-progress" aria-hidden="true">
          {services.map((service, index) => (
            <span key={service.id} data-on={index <= selected || undefined} />
          ))}
        </div>
        <h3 className="service-picker-includes">{home.services.includes}</h3>
        <ul className="service-picker-details">
          {item.includes.slice(0, 3).map((included) => (
            <li key={included}>{included}</li>
          ))}
        </ul>
        <Link
          className="btn btn-primary service-picker-quote"
          href={`/quote?service=${item.id}`}
        >
          {home.services.go}
        </Link>
      </div>
    </div>
  );
}
