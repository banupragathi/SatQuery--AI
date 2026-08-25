import React, { useMemo } from 'react';

// Generates a random box-shadow string for N stars within a 2000x2000px area
function generateStars(count, color) {
  let shadows = '';
  for (let i = 0; i < count; i++) {
    const x = Math.floor(Math.random() * 2000);
    const y = Math.floor(Math.random() * 2000);
    shadows += `${x}px ${y}px ${color}${i < count - 1 ? ', ' : ''}`;
  }
  return shadows;
}

export default function Starfield() {
  // Generate static star layers
  const starsSmall = useMemo(() => generateStars(350, 'rgba(255, 255, 255, 0.3)'), []);
  const starsMedium = useMemo(() => generateStars(100, 'rgba(255, 255, 255, 0.5)'), []);
  const cyanParticles = useMemo(() => generateStars(40, 'rgba(56, 189, 248, 0.4)'), []); // Tailwind cyan-400 tint

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true" style={{ zIndex: 0 }}>
      <style>{`
        .star-layer {
          position: absolute;
          top: 0;
          left: 0;
          background: transparent;
        }
        .stars-small {
          width: 1px;
          height: 1px;
          box-shadow: ${starsSmall};
        }
        .stars-medium {
          width: 2px;
          height: 2px;
          box-shadow: ${starsMedium};
          border-radius: 50%;
        }
        .particles-cyan {
          width: 3px;
          height: 3px;
          box-shadow: ${cyanParticles};
          border-radius: 50%;
          filter: blur(1px);
        }
      `}</style>
      <div className="star-layer stars-small" />
      <div className="star-layer stars-medium" />
      <div className="star-layer particles-cyan" />
    </div>
  );
}
