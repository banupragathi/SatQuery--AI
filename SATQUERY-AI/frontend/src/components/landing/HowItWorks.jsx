import Reveal from "../shared/Reveal.jsx";

/*
  HowItWorks.jsx
  ==============
  A genuine four-step sequence, so numbered markers (01-04) are appropriate
  here -- the order carries meaning the reader needs.
*/
const STEPS = [
  {
    n: "01",
    title: "Upload",
    body: "Provide satellite imagery in a supported format.",
  },
  {
    n: "02",
    title: "Ask",
    body: "Ask a question in natural language.",
  },
  {
    n: "03",
    title: "Understand",
    body: "SatQuery identifies what kind of analysis is required.",
  },
  {
    n: "04",
    title: "Answer",
    body: "Receive an understandable result from the imagery.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 py-24 sm:py-28">
      <div className="wrap">
        <Reveal>
          <p className="eyebrow mb-5">02 / How it works</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            One question.
            <br />
            <span className="text-cyan">The right analysis.</span>
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 0.08}>
              <div className="group relative h-full bg-panel p-7 transition-colors hover:bg-raised">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-cyan">{step.n}</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan/50 transition-colors group-hover:bg-cyan" />
                </div>
                <h3 className="mt-8 font-display text-xl font-medium text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
                {/* connector arrow (not after the last card) */}
                {i < STEPS.length - 1 && (
                  <span
                    className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 text-cyan/40 lg:block"
                    aria-hidden="true"
                  >
                    →
                  </span>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
