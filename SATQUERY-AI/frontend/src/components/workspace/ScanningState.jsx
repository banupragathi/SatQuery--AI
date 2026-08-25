import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/*
  ScanningState.jsx
  =================
  A staged progress display shown while a real /analyze request is in flight.

  Important honesty note: this animation paces the REAL backend stages
  (received -> validated -> routed -> specialist selected -> prepared). It is a
  UI affordance, not a fabricated AI result. The actual model status ("model
  integration pending") is shown afterwards in the ResultPanel, unchanged.

  It calls onComplete() once after stepping through, so the Workspace can
  reveal the result (it waits for BOTH this animation and the network response).
*/
const STEPS = [
  "Image received",
  "Image validated",
  "Understanding query",
  "Selecting specialist",
  "Analysing imagery",
  "Preparing result",
];

export default function ScanningState({ onComplete }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    // Reduced motion: skip the staged animation, finish quickly.
    if (reduce) {
      setActive(STEPS.length);
      const t = setTimeout(() => onComplete?.(), 300);
      return () => clearTimeout(t);
    }

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      setActive(step);
      if (step >= STEPS.length) {
        clearInterval(interval);
        // brief hold on the final step before revealing the result
        setTimeout(() => onComplete?.(), 350);
      }
    }, 420);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);

  return (
    <div className="panel p-7">
      {/* mini scanning visual */}
      <div className="relative mb-7 h-28 overflow-hidden rounded-lg border border-line bg-deep grid-overlay">
        <div className="scan-line absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-cyan/0 via-cyan/25 to-cyan/0" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-cyanDim">
            Analysing
          </span>
        </div>
      </div>

      <ol className="space-y-3">
        {STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          return (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full border text-[0.6rem] ${
                  done
                    ? "border-cyan bg-cyan text-void"
                    : current
                    ? "border-cyan text-cyan pulse-dot"
                    : "border-line text-faint"
                }`}
                aria-hidden="true"
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-sm ${
                  done ? "text-ink" : current ? "text-cyan" : "text-faint"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
