import Reveal from "../shared/Reveal.jsx";

/*
  BigIdea.jsx
  ===========
  Communicates the core idea: a satellite image + a plain-language question
  produces an understandable answer. The imagery here is a STYLED CONCEPTUAL
  visual built from SVG (no real image, no fabricated metrics) -- exactly what
  the brief asks for.
*/
export default function BigIdea() {
  return (
    <section className="relative py-24 sm:py-28">
      <div className="wrap grid items-center gap-14 lg:grid-cols-2">
        {/* Conceptual imagery panel */}
        <Reveal>
          <figure className="panel relative overflow-hidden p-3" aria-label="Conceptual satellite image with a detected water body">
            <div className="relative overflow-hidden rounded-lg">
              <svg viewBox="0 0 480 320" className="h-auto w-full">
                {/* base terrain */}
                <defs>
                  <linearGradient id="land" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#12233a" />
                    <stop offset="1" stopColor="#0b1a2c" />
                  </linearGradient>
                  <linearGradient id="water" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#123a52" />
                    <stop offset="1" stopColor="#0e5b73" />
                  </linearGradient>
                </defs>
                <rect width="480" height="320" fill="url(#land)" />
                {/* false-colour land patches */}
                <path d="M0 40 L140 0 L260 60 L180 140 L40 120 Z" fill="#16324a" opacity="0.7" />
                <path d="M300 0 L480 30 L480 150 L360 120 Z" fill="#14283f" opacity="0.7" />
                <path d="M40 200 L200 240 L160 320 L0 320 Z" fill="#183246" opacity="0.6" />
                {/* the water body */}
                <path
                  d="M250 150 C300 130 380 150 400 200 C410 250 350 280 300 270 C250 262 230 210 250 150 Z"
                  fill="url(#water)"
                />
                {/* grid overlay */}
                <g stroke="#4fd8ee" strokeWidth="0.5" opacity="0.14">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <line key={`v${i}`} x1={i * 32} y1="0" x2={i * 32} y2="320" />
                  ))}
                  {Array.from({ length: 10 }).map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 32} x2="480" y2={i * 32} />
                  ))}
                </g>
                {/* detection outline around the water body */}
                <rect
                  x="238"
                  y="132"
                  width="180"
                  height="156"
                  fill="none"
                  stroke="#4fd8ee"
                  strokeWidth="1.5"
                  strokeDasharray="6 5"
                  rx="4"
                />
                <rect x="238" y="116" width="118" height="16" fill="#4fd8ee" />
                <text x="246" y="128" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fill="#05070d">
                  WATER BODY · DETECTED
                </text>
                {/* corner ticks */}
                {[[8, 8], [472, 8], [8, 312], [472, 312]].map(([x, y], i) => (
                  <g key={i} stroke="#8896b2" strokeWidth="1" opacity="0.5">
                    <line x1={x - 6} y1={y} x2={x + 6} y2={y} />
                    <line x1={x} y1={y - 6} x2={x} y2={y + 6} />
                  </g>
                ))}
              </svg>
              {/* animated scanning line */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="scan-line absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-cyan/0 via-cyan/20 to-cyan/0" />
              </div>
            </div>
            <figcaption className="mt-3 flex items-center justify-between px-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-faint">
              <span>Conceptual scene · false colour</span>
              <span>Grid 32 px</span>
            </figcaption>
          </figure>
        </Reveal>

        {/* Idea + flow */}
        <Reveal delay={0.1}>
          <div>
            <p className="eyebrow mb-5">01 / The idea</p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
              See more.
              <br />
              Ask better.
              <br />
              <span className="text-cyan">Understand Earth.</span>
            </h2>
            <p className="mt-6 max-w-md leading-relaxed text-muted">
              Satellite imagery contains enormous amounts of information.
              SatQuery makes that information accessible through simple
              natural-language questions.
            </p>

            {/* the flow */}
            <div className="mt-9 space-y-3">
              <FlowRow label="Input" text="Satellite image" tone="muted" />
              <FlowRow label="Question" text="“Is there a water body?”" tone="ink" />
              <FlowRow label="SatQuery AI" text="Routes · analyses · answers" tone="cyan" />
              <FlowRow label="Answer" text="Water body detected" tone="ink" bordered />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function FlowRow({ label, text, tone, bordered }) {
  const toneClass =
    tone === "cyan" ? "text-cyan" : tone === "muted" ? "text-muted" : "text-ink";
  return (
    <div
      className={`flex items-center gap-4 rounded-lg px-4 py-3 ${
        bordered ? "border border-cyan/40 bg-cyan/[0.05]" : "bg-panel/60"
      }`}
    >
      <span className="w-28 shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-faint">
        {label}
      </span>
      <span className={`text-sm ${toneClass}`}>{text}</span>
    </div>
  );
}
