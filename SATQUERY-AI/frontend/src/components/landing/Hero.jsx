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
  Premium 2-column split-screen hero section.
  Left: headline, sub-headline, description, CTA buttons, sub-feature pills.
  Right: dedicated 3D Earth canvas with radial glow. No text overlay on the 3D.

  Motion policy: if the visitor prefers reduced motion, we skip the animated 3D
  scene entirely and show the static EarthFallback. The ErrorBoundary also
  swaps to the fallback if WebGL is unavailable.
*/
export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section
      id="hero-section"
      className="relative overflow-hidden"
    >
      {/* Main 2-column grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-6 pb-20 pt-28 sm:pt-32 lg:grid-cols-2 lg:gap-12 lg:pb-28">

        {/* ── Left Column: Text & Controls ── */}
        <div className="relative z-10 max-w-xl">
          {/* Cyan sub-header */}
          <p
            className="mb-6 font-mono uppercase"
            style={{
              fontSize: "10px",
              letterSpacing: "0.3em",
              color: "#38bdf8",
            }}
          >
            Multimodal remote-sensing intelligence
          </p>

          {/* Main title */}
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
            SatQuery AI
          </h1>

          {/* Sub-headline */}
          <p className="mt-5 font-display text-2xl font-medium leading-tight text-white sm:text-3xl">
            Turn satellite imagery
            <br />
            into{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #38bdf8 0%, #4c86f5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              intelligence.
            </span>
          </p>

          {/* Description */}
          <p
            className="mt-6 max-w-md text-base leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.55)" }}
          >
            Ask questions in natural language. Explore satellite imagery.
            Understand what Earth reveals.
          </p>

          {/* Action buttons */}
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/app"
              id="hero-cta-primary"
              className="inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "#38bdf8",
                color: "#050810",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.3)",
                letterSpacing: "0.14em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#5fcbfa";
                e.currentTarget.style.boxShadow = "0 8px 40px rgba(56, 189, 248, 0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#38bdf8";
                e.currentTarget.style.boxShadow = "0 0 25px rgba(56, 189, 248, 0.3)";
              }}
            >
              Try SatQuery AI
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href="#how-it-works"
              id="hero-cta-secondary"
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 font-mono text-sm font-medium uppercase tracking-wider text-white transition-all duration-200 hover:border-cyan hover:text-cyan"
              style={{
                background: "transparent",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                letterSpacing: "0.14em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#38bdf8";
                e.currentTarget.style.color = "#38bdf8";
                e.currentTarget.style.background = "rgba(56, 189, 248, 0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.background = "transparent";
              }}
            >
              How It Works
            </a>
          </div>

          {/* Sub-feature pills */}
          <p
            className="mt-8 font-mono text-xs uppercase"
            style={{
              letterSpacing: "0.24em",
              color: "rgba(255, 255, 255, 0.28)",
              fontSize: "0.68rem",
            }}
          >
            Optical · SAR · VQA · Captioning · Change · Grounding
          </p>
        </div>

        {/* ── Right Column: 3D Earth Scene ── */}
        <div className="relative mx-auto w-full max-w-[600px]">
          {/* Radial cyan background glow */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(circle at center, rgba(56, 189, 248, 0.12) 0%, transparent 65%)",
            }}
          />

          {/* 3D Canvas container */}
          <div
            className="relative w-full"
            style={{ height: "500px" }}
          >
            {/* Responsive height override for large screens */}
            <style>{`
              @media (min-width: 1024px) {
                .earth-canvas-container { height: 600px !important; }
              }
            `}</style>
            <div className="earth-canvas-container h-full w-full">
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
        </div>
      </div>

      {/* Bottom fade into the next section */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background: "linear-gradient(to bottom, transparent, #050810)",
        }}
      />
    </section>
  );
}
