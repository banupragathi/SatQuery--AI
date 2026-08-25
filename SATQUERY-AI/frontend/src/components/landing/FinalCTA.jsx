import { useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { RevealStagger, RevealItem } from "../shared/Reveal.jsx";
import OrbitalSpaceAtmosphere from "./OrbitalSpaceAtmosphere.jsx";

/*
  FinalCTA.jsx
  ============
  The closing hero CTA section.
  Features a cinematic space/orbital atmosphere with realistic celestial bodies
  orbiting quietly behind the central action prompt.
*/
export default function FinalCTA() {
  const reduce = useReducedMotion();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (reduce) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  return (
    <section
      className="relative overflow-hidden py-28 sm:py-36"
      onMouseMove={handleMouseMove}
    >
      {/* Realistic Space/Orbital Atmosphere with Planets & Particles */}
      <OrbitalSpaceAtmosphere reduce={reduce} mousePos={mousePos} />

      {/* Main Hero CTA Content */}
      <div className="wrap relative z-10 text-center">
        <RevealStagger staggerDelay={0.1}>
          <RevealItem>
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold leading-tight text-ink sm:text-5xl">
              Ask your satellite
              <br />
              imagery <span className="text-cyan">anything.</span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-6 font-mono text-sm uppercase tracking-[0.2em] text-muted">
              Upload · Ask · Discover
            </p>
          </RevealItem>
          <RevealItem>
            <div className="mt-10 flex justify-center">
              <Link to="/app" className="btn-primary text-sm">
                Launch SatQuery AI
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </RevealItem>
        </RevealStagger>
      </div>
    </section>
  );
}


