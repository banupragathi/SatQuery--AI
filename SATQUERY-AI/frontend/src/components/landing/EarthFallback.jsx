/*
  EarthFallback.jsx
  =================
  A high-quality STATIC globe, used when:
    - the visitor prefers reduced motion, or
    - WebGL is unavailable / the 3D scene fails to load.

  It uses only CSS gradients + a small SVG graticule, so it is cheap and always
  works. It intentionally mirrors the 3D version's look: navy sphere, cyan
  graticule, atmospheric rim, an orbital ring and one satellite dot.
*/
export default function EarthFallback() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {/* Orbital ring */}
      <div
        className="absolute rounded-[50%] border border-signal/30"
        style={{
          width: "115%",
          height: "115%",
          transform: "rotateX(72deg) rotateZ(18deg)",
        }}
        aria-hidden="true"
      >
        <span
          className="absolute h-2 w-2 rounded-full bg-ink"
          style={{ top: "-4px", left: "50%", boxShadow: "0 0 8px 2px rgba(79,216,238,0.7)" }}
        />
      </div>

      {/* Atmosphere glow */}
      <div
        className="absolute rounded-full"
        style={{
          width: "78%",
          height: "78%",
          background:
            "radial-gradient(circle at 50% 50%, transparent 58%, rgba(79,216,238,0.18) 70%, transparent 78%)",
        }}
        aria-hidden="true"
      />

      {/* Planet body */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "70%",
          height: "70%",
          background:
            "radial-gradient(circle at 35% 30%, #16305c 0%, #0c1a33 45%, #060d1c 78%, #04070f 100%)",
          boxShadow: "inset -18px -12px 60px rgba(0,0,0,0.75), 0 0 60px rgba(76,134,245,0.12)",
        }}
      >
        {/* Graticule */}
        <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <clipPath id="globe-clip">
              <circle cx="100" cy="100" r="100" />
            </clipPath>
          </defs>
          <g clipPath="url(#globe-clip)" fill="none" stroke="#2aa7be" strokeWidth="0.5" opacity="0.4">
            <ellipse cx="100" cy="100" rx="100" ry="30" />
            <ellipse cx="100" cy="100" rx="100" ry="60" />
            <ellipse cx="100" cy="100" rx="100" ry="90" />
            <line x1="100" y1="0" x2="100" y2="200" />
            <ellipse cx="100" cy="100" rx="30" ry="100" />
            <ellipse cx="100" cy="100" rx="60" ry="100" />
          </g>
        </svg>

        {/* A couple of surface data points */}
        <span className="absolute h-1.5 w-1.5 rounded-full bg-cyan" style={{ top: "38%", left: "58%" }} />
        <span className="absolute h-1.5 w-1.5 rounded-full bg-amber" style={{ top: "56%", left: "42%" }} />
      </div>
    </div>
  );
}
