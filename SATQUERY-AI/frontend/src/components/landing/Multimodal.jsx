import Reveal, { RevealStagger, RevealItem } from "../shared/Reveal.jsx";

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

        <RevealStagger className="mt-14 grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr]" staggerDelay={0.12}>
          {/* Optical channel */}
          <RevealItem>
            <Channel
              tag="Optical"
              tone="cyan"
              caption="Visible & near-infrared"
              imageSrc="/samples/optical-coastal.png"
            />
          </RevealItem>

          <RevealItem>
            <Operator symbol="+" />
          </RevealItem>

          {/* SAR channel */}
          <RevealItem>
            <Channel
              tag="SAR"
              tone="amber"
              caption="Radar backscatter"
              imageSrc="/samples/sar-coastal.png"
            />
          </RevealItem>

          <RevealItem>
            <Operator symbol="→" />
          </RevealItem>

          {/* Combined insight */}
          <RevealItem>
            <Channel
              tag="Combined"
              tone="mixed"
              caption="Fused insight"
              imageSrc="/samples/combined-coastal.png"
            />
          </RevealItem>
        </RevealStagger>
      </div>
    </section>
  );
}


function Channel({ tag, caption, tone, svg, imageSrc }) {
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
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={tag}
          className="w-full rounded object-cover"
          style={{ aspectRatio: '160/110' }}
        />
      ) : (
        <svg viewBox="0 0 160 110" className="w-full rounded">
          {svg}
        </svg>
      )}
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
