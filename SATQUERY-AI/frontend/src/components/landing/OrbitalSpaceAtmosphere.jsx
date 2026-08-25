import React, { useEffect, useRef } from "react";

/*
  OrbitalSpaceAtmosphere.jsx
  ==========================
  Cinematic Space & Orbital Background:
  - 100% FIXED, compact concentric orbit rings (sized precisely to prevent crossing section borders)
  - 5 realistic 3D planets (Earth, Mars, Gas Giant, Moon, Ice Planet) rendered via smooth 3D Value Noise shading
  - Sunlight vector remains fixed (top-left) as planets orbit for photorealistic 3D realism
  - Full support for prefers-reduced-motion
*/

// --- Smooth Trilinear 3D Value Noise Generator ---
function valueNoise3D(x, y, z) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  // Quintic fade curve: 6t^5 - 15t^4 + 10t^3
  const u = fx * fx * fx * (fx * (fx * 6.0 - 15.0) + 10.0);
  const v = fy * fy * fy * (fy * (fy * 6.0 - 15.0) + 10.0);
  const w = fz * fz * fz * (fz * (fz * 6.0 - 15.0) + 10.0);

  function rand3D(i, j, k) {
    const s = Math.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453;
    return s - Math.floor(s);
  }

  // Cell corners
  const c000 = rand3D(ix, iy, iz);
  const c100 = rand3D(ix + 1, iy, iz);
  const c010 = rand3D(ix, iy + 1, iz);
  const c110 = rand3D(ix + 1, iy + 1, iz);
  const c001 = rand3D(ix, iy, iz + 1);
  const c101 = rand3D(ix + 1, iy, iz + 1);
  const c011 = rand3D(ix, iy + 1, iz + 1);
  const c111 = rand3D(ix + 1, iy + 1, iz + 1);

  // Trilinear interpolation
  const n00 = c000 * (1 - u) + c100 * u;
  const n10 = c010 * (1 - u) + c110 * u;
  const n01 = c001 * (1 - u) + c101 * u;
  const n11 = c011 * (1 - u) + c111 * u;

  const n0 = n00 * (1 - v) + n10 * v;
  const n1 = n01 * (1 - v) + n11 * v;

  return n0 * (1 - w) + n1 * w;
}

// Fractional Brownian Motion using smooth trilinear noise
function fbm(x, y, z) {
  let total = 0.0;
  let amplitude = 0.5;
  let frequency = 1.0;
  for (let i = 0; i < 4; i++) {
    total += valueNoise3D(x * frequency, y * frequency, z * frequency) * amplitude;
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return total;
}

// --- Photorealistic 3D Planetary Sphere Renderer ---
function PlanetCanvas({ type, size }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = 128;
    const h = 128;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 2;

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;

    // Sunlight from top-left
    const lx = -0.577;
    const ly = -0.577;
    const lz = 0.577;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / radius;
        const dy = (y - cy) / radius;
        const distSq = dx * dx + dy * dy;

        if (distSq <= 1.0) {
          const dz = Math.sqrt(Math.max(0, 1.0 - distSq));
          const nx = dx;
          const ny = dy;
          const nz = dz;

          // Spherical projection
          const lon = Math.atan2(nx, nz);
          const lat = Math.asin(ny);

          // 3D Diffuse shade (strong terminator line for realistic space lighting)
          const dot = Math.max(0.0, nx * lx + ny * ly + nz * lz);
          const ambient = 0.05;
          const light = ambient + (1.0 - ambient) * Math.pow(dot, 1.1);

          let r = 0, g = 0, b = 0;

          if (type === "earth") {
            const n = fbm(lon * 2.0, lat * 2.0, 1.0);
            const clouds = fbm(lon * 3.0 + 0.5, lat * 3.0, 2.0);

            if (n > 0.46) {
              // Continent colors (Greens and Browns)
              const elev = (n - 0.46) * 2.0;
              r = 45 + elev * 60;
              g = 125 - elev * 40;
              b = 40 + elev * 10;
            } else {
              // Deep Ocean colors
              r = 10; g = 50; b = 130;
            }

            // Atmospheric Clouds
            if (clouds > 0.48) {
              const cVal = (clouds - 0.48) * 2.2 * 255;
              r = Math.min(255, r + cVal * 0.95);
              g = Math.min(255, g + cVal * 0.95);
              b = Math.min(255, b + cVal);
            }
          } else if (type === "mars") {
            const n = fbm(lon * 2.5, lat * 2.5, 0.5);
            if (lat < -1.15 || lat > 1.15) {
              // Polar Ice Cap
              r = 230; g = 235; b = 240;
            } else {
              // Rust and basalt dunes
              r = 165 - n * 50;
              g = 65 - n * 30;
              b = 35 - n * 15;
            }
          } else if (type === "gas-giant") {
            // Horizontal storm band aesthetics
            const bandVal = Math.sin(lat * 12.0 + fbm(lon * 1.5, lat * 1.5, 0.5) * 1.8);
            const normBand = (bandVal + 1.0) / 2.0;
            
            // Great Red Spot hurricane location
            const spotDist = Math.hypot(lon - 0.5, lat + 0.35);

            if (spotDist < 0.18) {
              r = 150; g = 40; b = 25;
            } else {
              r = 150 + normBand * 65;
              g = 100 + normBand * 35;
              b = 60 + normBand * 20;
            }
          } else if (type === "moon") {
            const n = fbm(lon * 3.5, lat * 3.5, 1.5);
            // Lunar basalt maria
            const base = 85 + n * 90;
            r = base; g = base; b = base * 1.05;
          } else if (type === "ice") {
            const n = fbm(lon * 2.8, lat * 2.8, 3.0);
            // Cyan icy fractures
            r = 30 + n * 40;
            g = 150 + n * 60;
            b = 195 + n * 50;
          }

          const idx = (y * w + x) * 4;
          data[idx] = Math.min(255, Math.max(0, r * light));
          data[idx + 1] = Math.min(255, Math.max(0, g * light));
          data[idx + 2] = Math.min(255, Math.max(0, b * light));
          data[idx + 3] = 255;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [type, size]);

  return <canvas ref={canvasRef} className="h-full w-full rounded-full" />;
}

// --- Orbital Ring & Planet Configuration (Scaled as ovals to rotate around wording) ---
const RINGS = [
  { id: 1, diameter: 700 },
  { id: 2, diameter: 800 },
  { id: 3, diameter: 900 },
  { id: 4, diameter: 1000 },
  { id: 5, diameter: 1100 },
];

const PLANETS = [
  {
    id: "earth",
    name: "Earth-like",
    size: 40,
    ringRadius: 450, // Ring 3 radius
    speed: 210,
    initialAngle: 145, 
    cw: false,
    glowColor: "rgba(56, 189, 248, 0.35)",
    type: "earth",
    particles: [60, 210],
  },
  {
    id: "mars",
    name: "Mars-like",
    size: 30,
    ringRadius: 400, // Ring 2 radius
    speed: 150,
    initialAngle: 35, 
    cw: true,
    glowColor: "rgba(245, 158, 11, 0.28)",
    type: "mars",
    particles: [120, 300],
  },
  {
    id: "gas-giant",
    name: "Gas Giant",
    size: 52,
    ringRadius: 500, // Ring 4 radius
    speed: 260,
    initialAngle: 215, 
    cw: false,
    glowColor: "rgba(217, 119, 6, 0.22)",
    type: "gas-giant",
    particles: [45, 225],
  },
  {
    id: "moon",
    name: "Moon",
    size: 24,
    ringRadius: 350, // Ring 1 radius
    speed: 110,
    initialAngle: 315, 
    cw: true,
    glowColor: "rgba(148, 163, 184, 0.24)",
    type: "moon",
    particles: [90, 270],
  },
  {
    id: "ice",
    name: "Ice Planet",
    size: 22,
    ringRadius: 550, // Ring 5 radius
    speed: 310,
    initialAngle: 75, 
    cw: false,
    glowColor: "rgba(34, 211, 238, 0.28)",
    type: "ice",
    particles: [160, 330],
  },
];

// --- Planet Orbiter Component (Runs high-performance JS translation loops to prevent planet flattening) ---
function PlanetOrbiter({ planet, reduce }) {
  const planetRef = useRef(null);
  const p1Ref = useRef(null);
  const p2Ref = useRef(null);

  useEffect(() => {
    const el = planetRef.current;
    const p1 = p1Ref.current;
    const p2 = p2Ref.current;
    if (!el) return;

    const semiMajor = planet.ringRadius;
    const semiMinor = planet.ringRadius * 0.38; // Matches scaled rings

    let angle = (planet.initialAngle * Math.PI) / 180;
    const speed = (2 * Math.PI) / (planet.speed * 60);
    const direction = planet.cw ? 1 : -1;

    let frameId;
    const update = () => {
      if (!reduce) {
        angle += speed * direction;
      }

      // Compute elliptical position coordinates
      const px = semiMajor * Math.cos(angle);
      const py = semiMinor * Math.sin(angle);
      el.style.transform = `translate(${px}px, ${py}px)`;

      // Position particle 1
      if (p1 && planet.particles[0] !== undefined) {
        const a1 = angle + (planet.particles[0] * Math.PI) / 180;
        const x1 = semiMajor * Math.cos(a1);
        const y1 = semiMinor * Math.sin(a1);
        p1.style.transform = `translate(${x1}px, ${y1}px)`;
      }

      // Position particle 2
      if (p2 && planet.particles[1] !== undefined) {
        const a2 = angle + (planet.particles[1] * Math.PI) / 180;
        const x2 = semiMajor * Math.cos(a2);
        const y2 = semiMinor * Math.sin(a2);
        p2.style.transform = `translate(${x2}px, ${y2}px)`;
      }

      frameId = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(frameId);
  }, [planet, reduce]);

  return (
    <>
      {/* 1. Perfectly Spherical 3D Planet */}
      <div
        ref={planetRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
      >
        <div
          className="relative rounded-full transition-transform duration-300 hover:scale-110"
          style={{
            width: `${planet.size}px`,
            height: `${planet.size}px`,
            // Dark cast shadow for solid depth, plus atmospheric scattering corona
            boxShadow: `0 8px 24px rgba(0, 0, 0, 0.85), inset 0 2px 4px rgba(255, 255, 255, 0.25), 0 0 12px ${planet.glowColor}`,
          }}
        >
          <PlanetCanvas type={planet.type} size={planet.size} />
          {/* Spherical shadow map cap: creates deep 3D shading hemisphere */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 32% 32%, transparent 40%, rgba(0,0,0,0.85) 90%)`,
              mixBlendMode: "multiply",
            }}
          />
          {/* Atmospheric scatter rim light */}
          <div
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 32% 32%, transparent 60%, ${planet.glowColor} 100%)`,
              mixBlendMode: "screen",
              opacity: 0.7,
            }}
          />
        </div>
      </div>

      {/* 2. Particle Tracers */}
      {planet.particles[0] !== undefined && (
        <div
          ref={p1Ref}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="h-1 w-1 rounded-full bg-cyan/70 shadow-[0_0_8px_#38bdf8] opacity-75" />
        </div>
      )}
      {planet.particles[1] !== undefined && (
        <div
          ref={p2Ref}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        >
          <div className="h-1 w-1 rounded-full bg-cyan/70 shadow-[0_0_8px_#38bdf8] opacity-75" />
        </div>
      )}
    </>
  );
}

export default function OrbitalSpaceAtmosphere({ reduce = false, mousePos = { x: 0, y: 0 } }) {
  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      aria-hidden="true"
      style={{
        transform: reduce
          ? "none"
          : `translate3d(${mousePos.x * 12}px, ${mousePos.y * 12}px, 0)`,
        transition: "transform 0.22s ease-out",
      }}
    >
      {/* 1. STATIONARY CONCENTRIC ELLIPTICAL ORBIT RINGS (Highly visible border-white) */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        style={{ transform: "scaleY(0.38)" }}
      >
        {RINGS.map((ring) => (
          <div
            key={ring.id}
            className="absolute rounded-full border border-white/[0.18] shadow-[0_0_12px_rgba(255,255,255,0.03)]"
            style={{
              width: `${ring.diameter}px`,
              height: `${ring.diameter}px`,
            }}
          />
        ))}
      </div>

      {/* 2. PLANET ORBITERS WITH NO DESTRUCTIVE SQUISHING */}
      {PLANETS.map((planet) => (
        <PlanetOrbiter key={planet.id} planet={planet} reduce={reduce} />
      ))}
    </div>
  );
}
