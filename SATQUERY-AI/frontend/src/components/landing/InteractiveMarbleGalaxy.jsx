import { useEffect, useRef } from "react";

/*
  InteractiveMarbleGalaxy.jsx
  ===========================
  Adds a highly optimized, subtle swirling "cosmic marble/nebula" effect
  that follows the mouse client coordinates.
  Tuned for deep space visual fidelity (cyan, blue, purple).
*/
export default function InteractiveMarbleGalaxy() {
  const canvasRef = useRef(null);

  useEffect(() => {
    // Disable or bypass entirely on touch/coarse devices to optimize performance
    const isMobile = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    if (isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize, { passive: true });

    // Track actual mouse & lerped coordinates for kinetic lag
    const mouse = { x: width / 2, y: height / 2 };
    const lerpMouse = { x: width / 2, y: height / 2 };
    
    let active = false;
    let animFrame = null;
    let activity = 0.0; // Dynamic intensity factor
    let puffs = [];

    const colors = [
      { r: 79, g: 216, b: 238 },  // Cyan
      { r: 76, g: 134, b: 245 },  // Blue
      { r: 168, g: 85, b: 247 },  // Purple
    ];

    const createPuff = (x, y, vx, vy) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = 110 + Math.random() * 80;
      
      puffs.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: vx * 0.15 + (Math.random() - 0.5) * 1.2,
        vy: vy * 0.15 + (Math.random() - 0.5) * 1.2,
        radius: size,
        color,
        alpha: 0.10 + Math.random() * 0.08,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.012,
        aspectRatio: 0.5 + Math.random() * 0.4, // Elongation to create marble swirl texture
        life: 140 + Math.random() * 60,
        age: 0,
      });

      if (puffs.length > 25) {
        puffs.shift();
      }
    };

    const drawPuff = (c, p) => {
      const lifeRatio = p.age / p.life;
      // Exponential fade out for smooth transitions
      const opacity = p.alpha * (lifeRatio < 0.25 ? lifeRatio / 0.25 : Math.pow(1 - lifeRatio, 1.5));
      if (opacity <= 0.001) return;

      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);

      // Organic radial gradient with multiple stops to simulate dust/gas
      const grad = c.createRadialGradient(0, 0, 0, 0, 0, p.radius);
      grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity})`);
      grad.addColorStop(0.3, `rgba(${Math.max(0, p.color.r - 25)}, ${Math.max(0, p.color.g - 25)}, ${p.color.b + 10}, ${opacity * 0.55})`);
      // Soft transition to purple dust at the edges
      grad.addColorStop(0.65, `rgba(168, 85, 247, ${opacity * 0.12})`);
      grad.addColorStop(1, "transparent");

      c.fillStyle = grad;
      c.beginPath();
      // Draw as distorted ellipse to create marble/ribbon texture matching fluid motion
      c.scale(1.3, p.aspectRatio);
      c.arc(0, 0, p.radius, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const updateAndRender = () => {
      // Lerp mouse coordinates to create smooth lag
      lerpMouse.x += (mouse.x - lerpMouse.x) * 0.07;
      lerpMouse.y += (mouse.y - lerpMouse.y) * 0.07;

      ctx.clearRect(0, 0, width, height);

      // Decay activity metric
      activity *= 0.95;
      if (activity < 0.001) activity = 0;

      // Filter expired puffs
      puffs = puffs.filter((p) => p.age < p.life);

      // Freeze execution loop when fully idle to consume 0% CPU
      if (puffs.length === 0 && activity === 0) {
        active = false;
        animFrame = null;
        return;
      }

      ctx.globalCompositeOperation = "screen";

      // 1. Draw central glowing halo following the cursor
      if (activity > 0) {
        const glowRadius = 240;
        const glowGrad = ctx.createRadialGradient(
          lerpMouse.x,
          lerpMouse.y,
          0,
          lerpMouse.x,
          lerpMouse.y,
          glowRadius
        );
        glowGrad.addColorStop(0, `rgba(79, 216, 238, ${0.12 * activity})`);
        glowGrad.addColorStop(0.4, `rgba(76, 134, 245, ${0.05 * activity})`);
        glowGrad.addColorStop(0.7, `rgba(168, 85, 247, ${0.02 * activity})`);
        glowGrad.addColorStop(1, "transparent");

        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(lerpMouse.x, lerpMouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Physics update and render of marble puffs
      for (let i = 0; i < puffs.length; i++) {
        const p = puffs[i];

        const dx = lerpMouse.x - p.x;
        const dy = lerpMouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1.0) {
          // Vortex / Swirl force calculations (perpendicular vector)
          const tx = -dy / dist;
          const ty = dx / dist;

          // Swirl is faster closer to core
          const swirlSpeed = Math.min(2.2, 280 / (dist + 70));
          p.vx += tx * swirlSpeed * 0.09;
          p.vy += ty * swirlSpeed * 0.09;

          // Soft gravitational pull towards cursor center
          p.vx += (dx / dist) * 0.025;
          p.vy += (dy / dist) * 0.025;
        }

        // Apply friction
        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;

        // Custom spin matching velocity
        p.rotation += p.angularVelocity + (p.vx + p.vy) * 0.0015;
        p.age++;

        drawPuff(ctx, p);
      }

      animFrame = requestAnimationFrame(updateAndRender);
    };

    const handleMouseMove = (e) => {
      const newX = e.clientX;
      const newY = e.clientY;

      const dx = newX - mouse.x;
      const dy = newY - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      mouse.x = newX;
      mouse.y = newY;

      // Reactivate activity factor
      activity = Math.min(1.0, activity + dist * 0.016);

      // Spawn new particles/puffs when cursor is moving
      if (dist > 2) {
        const spawnCount = dist > 18 ? 2 : 1;
        for (let i = 0; i < spawnCount; i++) {
          createPuff(newX, newY, dx, dy);
        }
      }

      if (!active) {
        active = true;
        animFrame = requestAnimationFrame(updateAndRender);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full opacity-60 mix-blend-screen"
      style={{ backfaceVisibility: "hidden" }}
    />
  );
}
