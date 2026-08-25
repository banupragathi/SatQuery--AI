import { useState } from "react";
import Reveal from "../shared/Reveal.jsx";

/*
  ChangeSection.jsx
  =================
  A before/after slider over two conceptual scenes. Dragging (or using the
  keyboard on the range input) reveals the "after" scene, where more built-up
  blocks appear. The response is conceptual ("Built-up expansion detected") --
  no fabricated statistics.
*/

// "Before" scene: sparse built-up area.
function SceneBefore() {
  return (
    <svg viewBox="0 0 480 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="480" height="300" fill="#0d2036" />
      <path d="M0 200 L480 170 L480 300 L0 300 Z" fill="#123a52" opacity="0.5" />
      <g fill="#1c3550">
        <rect x="60" y="120" width="18" height="18" />
        <rect x="120" y="150" width="16" height="16" />
        <rect x="200" y="130" width="20" height="20" />
        <rect x="300" y="160" width="16" height="16" />
      </g>
      <g stroke="#4fd8ee" strokeWidth="0.5" opacity="0.1">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={i} x1={i * 30} y1="0" x2={i * 30} y2="300" />
        ))}
      </g>
    </svg>
  );
}

// "After" scene: much denser built-up area.
function SceneAfter() {
  return (
    <svg viewBox="0 0 480 300" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      <rect width="480" height="300" fill="#0d2036" />
      <path d="M0 200 L480 170 L480 300 L0 300 Z" fill="#123a52" opacity="0.5" />
      <g fill="#24425f">
        {Array.from({ length: 40 }).map((_, i) => {
          const x = 40 + (i % 10) * 40 + ((i * 7) % 11);
          const y = 100 + Math.floor(i / 10) * 34 + ((i * 5) % 9);
          const s = 12 + ((i * 3) % 10);
          return <rect key={i} x={x} y={y} width={s} height={s} />;
        })}
      </g>
      {/* highlighted new expansion */}
      <g fill="none" stroke="#e8a64c" strokeWidth="1.4" strokeDasharray="5 4">
        <rect x="220" y="118" width="150" height="96" rx="3" />
      </g>
      <g stroke="#4fd8ee" strokeWidth="0.5" opacity="0.1">
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={i} x1={i * 30} y1="0" x2={i * 30} y2="300" />
        ))}
      </g>
    </svg>
  );
}

export default function ChangeSection() {
  const [pos, setPos] = useState(50); // 0..100, how much of "after" is revealed

  return (
    <section className="relative py-24 sm:py-28">
      <div className="wrap grid items-center gap-14 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <div>
            <p className="eyebrow mb-5">05 / Change over time</p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              Earth is always <span className="text-cyan">changing.</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted">
              Compare observations across time to identify and understand changes
              in the environment.
            </p>
            <div className="mt-8 space-y-3">
              <div className="rounded-lg bg-panel/60 px-4 py-3 text-sm text-ink">
                “Has the built-up area increased?”
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-amber/40 bg-amber/[0.06] px-4 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber pulse-dot" />
                <span className="text-sm text-ink">Built-up expansion detected.</span>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <figure className="panel overflow-hidden p-3">
            <div className="relative aspect-[16/10] overflow-hidden rounded-lg">
              {/* Before (base layer) */}
              <div className="absolute inset-0">
                <SceneBefore />
                <span className="absolute left-3 top-3 rounded bg-void/70 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                  Before
                </span>
              </div>

              {/* After (clipped by slider position) */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
              >
                <SceneAfter />
                <span className="absolute right-3 top-3 rounded bg-void/70 px-2 py-1 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-cyan">
                  After
                </span>
              </div>

              {/* Divider handle */}
              <div
                className="pointer-events-none absolute inset-y-0 w-px bg-cyan"
                style={{ left: `${pos}%` }}
              >
                <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan bg-void px-2 py-1 font-mono text-[0.55rem] text-cyan">
                  ⇆
                </span>
              </div>
            </div>

            {/* Accessible range control */}
            <label className="mt-3 block px-1">
              <span className="sr-only">Reveal the after image</span>
              <input
                type="range"
                min="0"
                max="100"
                value={pos}
                onChange={(e) => setPos(Number(e.target.value))}
                className="w-full accent-cyan"
                aria-label="Reveal the after image"
              />
            </label>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
