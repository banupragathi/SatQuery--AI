import { Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import EarthFallback from "./EarthFallback.jsx";
import ErrorBoundary from "../shared/ErrorBoundary.jsx";

// The 3D Earth pulls in three.js, so we lazy-load it -- it is not in the
// initial bundle's critical path.
const Earth = lazy(() => import("./Earth.jsx"));

/*
  Hero.jsx
  ========
  The thesis of the page: Earth as an observable, queryable object. On the left,
  the headline and CTA; on the right (or behind, on mobile), the globe.

  Motion policy: if the visitor prefers reduced motion, we skip the animated 3D
  scene entirely and show the static EarthFallback. The ErrorBoundary also
  swaps to the fallback if WebGL is unavailable.
*/
export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative overflow-hidden pb-24 pt-28 sm:pt-32">
      {/* Globe layer */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center lg:justify-end lg:pr-[6%]"
        aria-hidden="true"
      >
        <div className="h-[min(78vw,560px)] w-[min(78vw,560px)] opacity-70 lg:opacity-100">
          {reduce ? (
            <EarthFallback />
          ) : (
            <ErrorBoundary fallback={<EarthFallback />}>
              <Suspense fallback={<EarthFallback />}>
                <Earth />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      </div>

      {/* Text layer */}
      <div className="wrap relative">
        <div className="max-w-xl">
          <p className="eyebrow mb-6">Multimodal remote-sensing intelligence</p>

          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            SatQuery AI
          </h1>

          <p className="mt-5 font-display text-2xl font-medium leading-tight text-ink sm:text-3xl">
            Turn satellite imagery
            <br />
            into <span className="text-cyan">intelligence.</span>
          </p>

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            Ask questions in natural language. Explore satellite imagery.
            Understand what Earth reveals.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/app" className="btn-primary">
              Try SatQuery AI
              <span aria-hidden="true">→</span>
            </Link>
            <a href="#how-it-works" className="btn-ghost">
              How it works
            </a>
          </div>

          <p className="mt-8 font-mono text-[0.68rem] uppercase tracking-[0.24em] text-faint">
            Optical · SAR · VQA · Captioning · Change · Grounding
          </p>
        </div>
      </div>

      {/* Bottom fade into the next section */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-void" />
    </section>
  );
}
