import { useState, useRef, useCallback } from "react";

export default function ImageCompare({ beforeUrl, afterUrl, beforeLabel, afterLabel }) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef(null);
  const dragging = useRef(false);

  const updatePosition = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = (e) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e) => {
    if (!dragging.current) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = () => {
    dragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] w-full cursor-col-resize select-none overflow-hidden rounded-lg border border-line bg-deep"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* AFTER image (full, underneath) */}
      <img
        src={afterUrl}
        alt={afterLabel || "Later"}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />

      {/* BEFORE image (clipped by slider position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel || "Earlier"}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ width: `${containerRef.current?.offsetWidth || 1000}px`, maxWidth: "none" }}
          draggable={false}
        />
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 h-full"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Vertical line */}
        <div className="h-full w-0.5 bg-cyan shadow-[0_0_8px_rgba(79,216,238,0.6)]" />

        {/* Drag handle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan bg-void/90 shadow-[0_0_12px_rgba(79,216,238,0.4)]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M5 3L2 8L5 13" stroke="#4FD8EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 3L14 8L11 13" stroke="#4FD8EE" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute left-3 top-3 rounded bg-void/80 px-2.5 py-1 backdrop-blur-sm">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-cyan">
          {beforeLabel || "Earlier"}
        </span>
      </div>
      <div className="absolute right-3 top-3 rounded bg-void/80 px-2.5 py-1 backdrop-blur-sm">
        <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-cyan">
          {afterLabel || "Later"}
        </span>
      </div>

      {/* Instruction hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-void/70 px-3 py-1 backdrop-blur-sm">
        <span className="font-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted">
          Drag to compare
        </span>
      </div>
    </div>
  );
}