import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/*
  Navbar.jsx
  ==========
  Sticky top navigation. It starts nearly transparent over the hero and becomes
  more opaque (with a hairline and blur) once the page is scrolled, so it stays
  legible over content further down.
*/
const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Multimodal", href: "#multimodal" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-line bg-void/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="wrap flex h-16 items-center justify-between">
        {/* Left: wordmark */}
        <Link to="/" className="flex items-baseline gap-3" aria-label="SatQuery AI home">
          <span className="font-display text-lg font-semibold tracking-wide text-ink">
            SATQUERY<span className="text-cyan"> AI</span>
          </span>
          <span className="hidden font-mono text-[0.6rem] uppercase tracking-[0.28em] text-faint sm:inline">
            Remote Sensing Intelligence
          </span>
        </Link>

        {/* Right: section links + launch */}
        <div className="flex items-center gap-6">
          <ul className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-cyan"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <Link to="/app" className="btn-primary text-[0.72rem]">
            Launch SatQuery
          </Link>
        </div>
      </nav>
    </header>
  );
}
