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
      // Increase size slightly for 20-30% more visibility
      const size = 130 + Math.random() * 90;
      
      puffs.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        vx: vx * 0.15 + (Math.random() - 0.5) * 1.5,
        vy: vy * 0.15 + (Math.random() - 0.5) * 1.5,
        radius: size,
        color,
        // Increased alpha baseline for better glow visibility
        alpha: 0.14 + Math.random() * 0.10,
        rotation: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.012,
        aspectRatio: 0.5 + Math.random() * 0.4, // Elongation to create marble swirl texture
        // Increase lifespan to keep the effect continuous for longer
        life: 180 + Math.random() * 80,
        age: 0,
      });

      if (puffs.length > 35) {
        puffs.shift();
      }
    };

    const drawPuff = (c, p) => {
      const lifeRatio = p.age / p.life;
      // Fade out smoothly
      const opacity = p.alpha * (lifeRatio < 0.25 ? lifeRatio / 0.25 : Math.pow(1 - lifeRatio, 1.2));
      if (opacity <= 0.001) return;

      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rotation);

      // Organic radial gradient with multiple stops to simulate dust/gas
      const grad = c.createRadialGradient(0, 0, 0, 0, 0, p.radius);
      grad.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${opacity})`);
      grad.addColorStop(0.3, `rgba(${Math.max(0, p.color.r - 20)}, ${Math.max(0, p.color.g - 20)}, ${p.color.b + 20}, ${opacity * 0.65})`);
      grad.addColorStop(0.65, `rgba(168, 85, 247, ${opacity * 0.15})`);
      grad.addColorStop(1, "transparent");

      c.fillStyle = grad;
      c.beginPath();
      c.scale(1.3, p.aspectRatio);
      c.arc(0, 0, p.radius, 0, Math.PI * 2);
      c.fill();
      c.restore();
    };

    const updateAndRender = () => {
      // Smoother delayed tracking
      lerpMouse.x += (mouse.x - lerpMouse.x) * 0.045;
      lerpMouse.y += (mouse.y - lerpMouse.y) * 0.045;

      ctx.clearRect(0, 0, width, height);

      // Slower decay for continuous feeling. The glow lingers longer when stopped.
      activity *= 0.985;
      if (activity < 0.001) activity = 0;

      // Filter expired puffs
      puffs = puffs.filter((p) => p.age < p.life);

      if (puffs.length === 0 && activity === 0) {
        active = false;
        animFrame = null;
        return;
      }

      ctx.globalCompositeOperation = "screen";

      // 1. Draw central glowing halo following the cursor
      if (activity > 0) {
        const glowRadius = 280;
        const glowGrad = ctx.createRadialGradient(
          lerpMouse.x,
          lerpMouse.y,
          0,
          lerpMouse.x,
          lerpMouse.y,
          glowRadius
        );
        // Slightly brighter underlying halo
        glowGrad.addColorStop(0, `rgba(79, 216, 238, ${0.15 * activity})`);
        glowGrad.addColorStop(0.4, `rgba(76, 134, 245, ${0.06 * activity})`);
        glowGrad.addColorStop(0.7, `rgba(168, 85, 247, ${0.03 * activity})`);
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
          const tx = -dy / dist;
          const ty = dx / dist;

          const swirlSpeed = Math.min(2.5, 300 / (dist + 70));
          p.vx += tx * swirlSpeed * 0.09;
          p.vy += ty * swirlSpeed * 0.09;

          p.vx += (dx / dist) * 0.035;
          p.vy += (dy / dist) * 0.035;
        }

        p.vx *= 0.95;
        p.vy *= 0.95;

        p.x += p.vx;
        p.y += p.vy;

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

      // Faster activity ramp up
      activity = Math.min(1.0, activity + dist * 0.025);

      if (dist > 2) {
        const spawnCount = dist > 15 ? 2 : 1;
        for (let i = 0; i < spawnCount; i++) {
          createPuff(newX, newY, dx, dy);
        }
      }

      if (!active) {
        active = true;
        animFrame = requestAnimationFrame(updateAndRender);
      }
    };

    // Make sure we track movement even during scroll to feel continuous
    const handleScroll = () => {
      // Just keep activity moderately alive to wake up the glow safely during scroll
      activity = Math.min(1.0, activity + 0.15);
      if (!active) {
        active = true;
        animFrame = requestAnimationFrame(updateAndRender);
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      if (animFrame) cancelAnimationFrame(animFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      // Increased z-index to overlay across all sections rather than being hidden under them
      // Increased opacity from 60 to 85 for the requested 20-30% boost.
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full opacity-85 mix-blend-screen"
      style={{ backfaceVisibility: "hidden" }}
    />
  );
}
