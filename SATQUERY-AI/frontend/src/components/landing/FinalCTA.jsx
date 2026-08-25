import { Link } from "react-router-dom";
import Reveal from "../shared/Reveal.jsx";

/*
  FinalCTA.jsx
  ============
  The closing call to action. One clear action -> /app.
*/
export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden py-28 sm:py-36">
      {/* faint orbital arc behind the text */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
        <div className="spin-slow h-[520px] w-[520px] rounded-full border border-line" />
        <div className="absolute h-[380px] w-[380px] rounded-full border border-line/60" />
      </div>

      <div className="wrap relative text-center">
        <Reveal>
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
            Ask your satellite
            <br />
            imagery <span className="text-cyan">anything.</span>
          </h2>
          <p className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-muted">
            Upload · Ask · Discover
          </p>
          <div className="mt-10 flex justify-center">
            <Link to="/app" className="btn-primary text-sm">
              Launch SatQuery AI
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
