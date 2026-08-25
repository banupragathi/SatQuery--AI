import { Link } from "react-router-dom";

/*
  Footer.jsx
  ==========
  Honest footer -- no invented company info, partnerships, or social accounts.
*/
const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Multimodal", href: "#multimodal" },
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-deep/60">
      <div className="wrap flex flex-col gap-8 py-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <div className="font-display text-lg font-semibold tracking-wide text-ink">
            SATQUERY<span className="text-cyan"> AI</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Interactive vision-language assistant for multimodal remote-sensing
            analysis.
          </p>
        </div>

        <nav aria-label="Footer">
          <ul className="flex flex-col gap-3 sm:items-end">
            {LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-cyan"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/app"
                className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-cyan"
              >
                Launch →
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t border-line">
        <div className="wrap flex flex-col gap-2 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">
            © 2026 SatQuery AI
          </p>
          <p className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">
            Problem Statement · SIH26167
          </p>
        </div>
      </div>
    </footer>
  );
}
