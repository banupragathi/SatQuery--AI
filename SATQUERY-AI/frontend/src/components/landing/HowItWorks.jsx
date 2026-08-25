import Reveal from "../shared/Reveal.jsx";

/*
  HowItWorks.jsx
  ==============
  A clean satellite-mission pipeline describing the core workflow.
  Features subtle HUD/technical accents for a premium space-intelligence feel.
*/
const STEPS = [
  {
    n: "01",
    title: "ACQUIRE",
    body: "Ingest satellite imagery via supported remote-sensing formats.",
    status: "DATA_LINK",
    coord: "45.1N 12.3W",
  },
  {
    n: "02",
    title: "QUERY",
    body: "Submit natural language questions to the multimodal engine.",
    status: "NLP_SYNC",
    coord: "51.5N 0.1W",
  },
  {
    n: "03",
    title: "ANALYZE",
    body: "Vision models identify features and extract targeted insights.",
    status: "INFERENCE",
    coord: "35.6N 139.6E",
  },
  {
    n: "04",
    title: "INTELLIGENCE",
    body: "Receive actionable intelligence, grounded directly in the imagery.",
    status: "EXTRACTED",
    coord: "37.7N 122.4W",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-24 sm:py-28">
      <div className="wrap">
        <Reveal>
          <div className="flex items-center gap-3 mb-5">
            <span className="h-[1px] w-8 bg-cyan/40"></span>
            <p className="eyebrow">02 / Pipeline</p>
          </div>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            One question.
            <br />
            <span className="text-cyan">The right analysis.</span>
          </h2>
        </Reveal>

        <div className="mt-14 relative">
          {/* Continuous dashed connecting line behind the cards (visible on lg screens) */}
          <div className="absolute top-[3.25rem] left-8 right-8 hidden h-[1px] border-t border-dashed border-cyan/20 lg:block" aria-hidden="true"></div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <Reveal key={step.n} delay={i * 0.1}>
                <div className="group relative h-full rounded-xl border border-line bg-panel/60 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-cyan/40 hover:bg-cyan/[0.02] hover:shadow-[0_0_20px_rgba(56,189,248,0.05)] overflow-hidden">
                  
                  {/* Subtle geospatial grid background (visible on hover) */}
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true" style={{ backgroundImage: "linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px)", backgroundSize: "1rem 1rem" }}></div>

                  {/* Top HUD bar */}
                  <div className="relative flex items-center justify-between border-b border-line pb-4 transition-colors group-hover:border-cyan/20">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-cyan">
                      SEQ_{step.n}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted group-hover:text-cyan/70 transition-colors">
                        [{step.status}]
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan opacity-40"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan/80"></span>
                      </span>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="relative pt-8 pb-4">
                    <h3 className="font-mono text-lg font-semibold tracking-wider text-ink transition-colors group-hover:text-cyan">
                      {step.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-muted transition-colors group-hover:text-ink/80">
                      {step.body}
                    </p>
                  </div>

                  {/* Bottom geospatial accent */}
                  <div className="absolute bottom-4 left-7 right-7 flex items-center justify-between opacity-40 transition-opacity group-hover:opacity-100">
                    <span className="font-mono text-[9px] text-muted/60">{step.coord}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-cyan/40">
                      <path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                      <circle cx="6" cy="6" r="3" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </div>

                  {/* Corner brackets (HUD feel) */}
                  <div className="absolute top-0 left-0 h-3 w-3 border-t border-l border-cyan/0 transition-colors group-hover:border-cyan/50"></div>
                  <div className="absolute top-0 right-0 h-3 w-3 border-t border-r border-cyan/0 transition-colors group-hover:border-cyan/50"></div>
                  <div className="absolute bottom-0 left-0 h-3 w-3 border-b border-l border-cyan/0 transition-colors group-hover:border-cyan/50"></div>
                  <div className="absolute bottom-0 right-0 h-3 w-3 border-b border-r border-cyan/0 transition-colors group-hover:border-cyan/50"></div>

                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
