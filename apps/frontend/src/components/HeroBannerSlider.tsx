"use client";

import Image from "next/image";
import { ReactNode, useCallback, useEffect, useState } from "react";

export type HeroSlide = {
  src: string;
  alt: string;
};

type HeroBannerSliderProps = {
  slides: HeroSlide[];
  tagline: string;
  whatsapp?: string;
  primaryCta: ReactNode;
  secondaryCta: ReactNode;
  intervalMs?: number;
};

export default function HeroBannerSlider({
  slides,
  tagline,
  whatsapp = "",
  primaryCta,
  secondaryCta,
  intervalMs = 6500,
}: HeroBannerSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2 || paused) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused]);

  if (count === 0) return null;

  return (
    <section
      className="hero-plane relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Prosperax community stories"
    >
      <div className="absolute inset-0">
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.src}
            className={`absolute inset-0 transition-opacity duration-1000 ease-out ${
              slideIndex === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={slideIndex !== index}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={slideIndex === 0}
              sizes="100vw"
              className={`hero-photo object-cover ${
                slideIndex === index ? "hero-slide-active" : ""
              }`}
            />
          </div>
        ))}
      </div>

      <div className="hero-overlay pointer-events-none absolute inset-0" aria-hidden />
      <div className="hero-grain pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative mx-auto flex min-h-[82vh] max-w-6xl flex-col justify-center px-4 py-24 sm:px-6">
        <p className="animate-rise inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-black/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/90 backdrop-blur-sm">
          <span className="h-2 w-2 rounded-full bg-[#7ee2a8] shadow-[0_0_0_4px_rgba(126,226,168,0.18)]" />
          Mutual aid, made trustworthy
        </p>
        <h1 className="animate-rise-delay mt-6 max-w-2xl font-display text-5xl font-semibold leading-[0.98] text-white sm:text-7xl">
          {tagline}
        </h1>
        <p className="animate-rise-delay-2 mt-6 max-w-lg text-lg leading-relaxed text-white/80">
          Peer-to-peer help, held safely until weekly payout. Not crowdfunding. Not investment.
        </p>
        <div className="animate-rise-delay-2 mt-8 flex flex-wrap gap-3">
          {primaryCta}
          {secondaryCta}
          {whatsapp ? (
            <a
              href={whatsapp}
              target="_blank"
              rel="noreferrer"
              className="icon-button border border-white/30 bg-black/10 px-5 py-3 font-semibold text-white/90 backdrop-blur-md transition hover:border-white hover:bg-black/20"
            >
              Follow on WhatsApp
            </a>
          ) : null}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/15"
              aria-label="Previous slide"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/20 text-white backdrop-blur-md transition hover:bg-white/15"
              aria-label="Next slide"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2" role="tablist" aria-label="Hero slides">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.src}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Show slide ${slideIndex + 1}`}
                onClick={() => go(slideIndex)}
                className={`h-2.5 rounded-full transition-all ${
                  slideIndex === index
                    ? "w-8 bg-white"
                    : "w-2.5 bg-white/45 hover:bg-white/75"
                }`}
              />
            ))}
          </div>

          <p className="text-xs font-medium tracking-[0.14em] text-white/65">
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </p>
        </div>
      </div>
    </section>
  );
}
