import { motion, useReducedMotion } from "framer-motion";

/*
  Reveal.jsx
  ==========
  Wraps children in a subtle fade-and-rise as they scroll into view. If the
  visitor prefers reduced motion, it renders a plain div with no animation.
  Keeping this in one place means every section animates consistently.
*/
export default function Reveal({ children, delay = 0, className = "" }) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
