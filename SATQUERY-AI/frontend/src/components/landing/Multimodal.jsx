import Reveal from "../shared/Reveal.jsx";

/*
  Multimodal.jsx
  ==============
  Explains optical + SAR fusion visually: two different sensor "channels" feed
  into SatQuery and combine into a single insight. Scientifically plausible,
  no fabricated numbers.
*/
export default function Multimodal() {
  return (
    <section id="multimodal" className="relative scroll-mt-20 border-y border-line bg-deep/60 py-24 sm:py-28">
      <div className="wrap">
        <Reveal>
          <p className="eyebrow mb-5">04 / Multimodal</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            One Earth.
            <br />
            <span className="text-cyan">Multiple perspectives.</span>
          </h2>
          <p className="mt-6 max-w-lg leading-relaxed text-muted">
            Optical sensors capture what the eye would see. SAR sees through
            cloud and darkness. SatQuery is built to reason over both.
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            {/* Optical channel */}
            <Channel
              tag="Optical"
              tone="cyan"
              caption="Visible & near-infrared"
              svg={
                <>
                  <rect width="160" height="110" fill="#0c2135" />
                  <g stroke="#4fd8ee" strokeWidth="0.5" opacity="0.2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <line key={i} x1={i * 20} y1="0" x2={i * 20} y2="110" />
                    ))}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <line key={i} x1="0" y1={i * 20} x2="160" y2={i * 20} />
                    ))}
                  </g>
                  <path d="M20 70 L70 40 L110 66 L150 44 L160 60 L160 110 L0 110 Z" fill="#14304a" />
                  <ellipse cx="60" cy="82" rx="26" ry="12" fill="#12455e" />
                </>
              }
            />

            <Operator symbol="+" />

            {/* SAR channel */}
            <Channel
              tag="SAR"
              tone="amber"
              caption="Radar backscatter"
              svg={
                <>
                  <rect width="160" height="110" fill="#241b12" />
                  {Array.from({ length: 220 }).map((_, i) => (
                    <rect
                      key={i}
                      x={(i * 37) % 160}
                      y={(i * 53) % 110}
                      width="1.5"
                      height="1.5"
                      fill="#e8a64c"
                      opacity={((i % 5) + 1) / 8}
                    />
                  ))}
                  <path d="M20 70 L70 40 L110 66 L150 44 L160 60 L160 110 L0 110 Z" fill="none" stroke="#e8a64c" strokeWidth="1" opacity="0.6" />
                </>
              }
            />

            <Operator symbol="→" />

            {/* Combined insight */}
            <Channel
              tag="Combined"
              tone="mixed"
              caption="Fused insight"
              svg={
                <>
                  <rect width="160" height="110" fill="#0c1a2a" />
                  <path d="M20 70 L70 40 L110 66 L150 44 L160 60 L160 110 L0 110 Z" fill="#14304a" />
                  <ellipse cx="60" cy="82" rx="26" ry="12" fill="#12455e" />
                  <rect x="34" y="30" width="52" height="30" fill="none" stroke="#4fd8ee" strokeWidth="1.2" strokeDasharray="4 3" />
                  <rect x="96" y="58" width="46" height="34" fill="none" stroke="#e8a64c" strokeWidth="1.2" strokeDasharray="4 3" />
                  <text x="36" y="26" fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#4fd8ee">BUILT-UP</text>
                  <text x="98" y="54" fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#e8a64c">WATER</text>
                </>
              }
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Channel({ tag, caption, tone, svg }) {
  const tagColor =
    tone === "cyan" ? "text-cyan" : tone === "amber" ? "text-amber" : "text-ink";
  return (
    <figure className="panel overflow-hidden p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={`font-mono text-[0.62rem] uppercase tracking-[0.18em] ${tagColor}`}>
          {tag}
        </span>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === "amber" ? "#e8a64c" : "#4fd8ee" }} />
      </div>
      <svg viewBox="0 0 160 110" className="w-full rounded">
        {svg}
      </svg>
      <figcaption className="mt-2 px-1 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">
        {caption}
      </figcaption>
    </figure>
  );
}

function Operator({ symbol }) {
  return (
    <div className="flex items-center justify-center py-2 lg:py-0">
      <span className="font-display text-2xl text-cyanDim">{symbol}</span>
    </div>
  );
}
