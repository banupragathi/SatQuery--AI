import { motion, useReducedMotion } from "framer-motion";

/*
  Reveal.jsx
  ==========
  Subtle fade-and-rise entrance animations for section elements.
  Supports individual reveals, stagger containers, and staggered items.
  Fully respects prefers-reduced-motion.
*/
export default function Reveal({
  children,
  delay = 0,
  className = "",
  direction = "up",
  distance = 20,
  duration = 0.7,
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  const yOffset = direction === "up" ? distance : direction === "down" ? -distance : 0;
  const xOffset = direction === "left" ? distance : direction === "right" ? -distance : 0;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: yOffset, x: xOffset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function RevealStagger({ children, className = "", staggerDelay = 0.1, delay = 0 }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className = "", distance = 20, duration = 0.6 }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: distance },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: [0.16, 1, 0.3, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

