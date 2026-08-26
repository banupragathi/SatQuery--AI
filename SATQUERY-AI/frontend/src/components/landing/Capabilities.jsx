import Reveal, { RevealStagger, RevealItem } from "../shared/Reveal.jsx";

/*
  Capabilities.jsx
  ================
  Five capabilities, each with its own mini-visual so the cards do not read as
  identical templates. Laid out as a bento grid: ASK is featured (wider),
  the rest sit alongside. Only ASK and DESCRIBE are active today; COMPARE,
  LOCATE and FUSE are labelled as planned so the page stays honest.
*/

// --- distinct mini glyphs ---------------------------------------------------
function AskGlyph() {
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full">
      <rect x="4" y="10" width="60" height="44" rx="4" fill="#0e2033" stroke="#25415f" />
      <g stroke="#4fd8ee" strokeWidth="0.6" opacity="0.3">
        <line x1="20" y1="10" x2="20" y2="54" />
        <line x1="36" y1="10" x2="36" y2="54" />
        <line x1="52" y1="10" x2="52" y2="54" />
        <line x1="4" y1="26" x2="64" y2="26" />
        <line x1="4" y1="42" x2="64" y2="42" />
      </g>
      <circle cx="44" cy="34" r="9" fill="none" stroke="#4fd8ee" strokeWidth="1.5" strokeDasharray="3 3" />
      <rect x="74" y="20" width="42" height="12" rx="6" fill="#0e2033" stroke="#25415f" />
      <text x="80" y="29" fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#8896b2">?</text>
      <path d="M74 44 h34" stroke="#4fd8ee" strokeWidth="1.5" />
      <path d="M74 52 h22" stroke="#2aa7be" strokeWidth="1.5" />
    </svg>
  );
}
function DescribeGlyph() {
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-full">
      <rect x="4" y="8" width="40" height="54" rx="4" fill="#0e2033" stroke="#25415f" />
      <path d="M10 20 h28 M10 30 h28 M10 40 h20" stroke="#2aa7be" strokeWidth="1" opacity="0.5" />
      {[16, 28, 40, 52].map((y, i) => (
        <g key={i}>
          <path d={`M58 ${y} h${52 - i * 6}`} stroke="#4fd8ee" strokeWidth="1.5" opacity={1 - i * 0.18} />
        </g>
      ))}
    </svg>
  );
}
function CompareGlyph() {
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-full">
      <rect x="6" y="10" width="48" height="50" rx="4" fill="#0e2033" stroke="#25415f" />
      <rect x="66" y="10" width="48" height="50" rx="4" fill="#0e2033" stroke="#25415f" />
      <rect x="14" y="34" width="14" height="18" fill="#183a54" />
      <rect x="74" y="24" width="26" height="28" fill="#1b4a66" />
      <path d="M60 35 l-4 -4 v3 h-4 v2 h4 v3 z" fill="#e8a64c" />
    </svg>
  );
}
function LocateGlyph() {
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-full">
      <rect x="6" y="8" width="108" height="54" rx="4" fill="#0e2033" stroke="#25415f" />
      <rect x="40" y="22" width="34" height="26" fill="none" stroke="#e8a64c" strokeWidth="1.5" />
      <line x1="57" y1="8" x2="57" y2="62" stroke="#4fd8ee" strokeWidth="0.5" opacity="0.4" />
      <line x1="6" y1="35" x2="114" y2="35" stroke="#4fd8ee" strokeWidth="0.5" opacity="0.4" />
      <circle cx="57" cy="35" r="3" fill="#e8a64c" />
    </svg>
  );
}
function FuseGlyph() {
  return (
    <svg viewBox="0 0 120 70" className="h-16 w-full">
      <rect x="10" y="10" width="52" height="40" rx="4" fill="#123a52" opacity="0.8" />
      <rect x="40" y="24" width="52" height="40" rx="4" fill="#2a2036" opacity="0.85" stroke="#e8a64c" strokeWidth="0.7" />
      <text x="16" y="24" fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#4fd8ee">OPTICAL</text>
      <text x="52" y="60" fontFamily="'IBM Plex Mono',monospace" fontSize="7" fill="#e8a64c">SAR</text>
    </svg>
  );
}

const CARDS = [
  {
    verb: "Ask",
    name: "Visual Question Answering",
    example: "“Is there a water body in this image?”",
    status: "Active",
    Glyph: AskGlyph,
    featured: true,
  },
  {
    verb: "Describe",
    name: "Scene Description / Captioning",
    example: "“Describe the land cover in this image.”",
    status: "Active",
    Glyph: DescribeGlyph,
  },
  {
    verb: "Compare",
    name: "Change Analysis",
    example: "“What changed between these two dates?”",
    status: "Planned",
    Glyph: CompareGlyph,
  },
  {
    verb: "Locate",
    name: "Region Grounding",
    example: "“Highlight the water body.”",
    status: "Active",
    Glyph: LocateGlyph,
  },
  {
    verb: "Fuse",
    name: "Optical + SAR",
    example: "“Identify built-up and water-covered regions using both images.”",
    status: "Planned",
    Glyph: FuseGlyph,
  },
];

export default function Capabilities() {
  return (
    <section id="capabilities" className="relative scroll-mt-20 py-24 sm:py-28">
      <div className="wrap">
        <Reveal>
          <p className="eyebrow mb-5">03 / Capabilities</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            One interface.
            <br />
            <span className="text-cyan">Multiple ways to understand Earth.</span>
          </h2>
        </Reveal>

        <RevealStagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" staggerDelay={0.08}>
          {CARDS.map((card) => (
            <RevealItem
              key={card.verb}
              className={card.featured ? "sm:col-span-2 lg:col-span-2" : ""}
            >
              <article className="panel group h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-ink">
                      {card.verb}
                    </h3>
                    <p className="mt-1 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-cyanDim">
                      {card.name}
                    </p>
                  </div>
                  <StatusTag status={card.status} />
                </div>

                <div className="my-6">
                  <card.Glyph />
                </div>

                <p className="text-sm leading-relaxed text-muted">{card.example}</p>
              </article>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}


function StatusTag({ status }) {
  const active = status === "Active";
  return (
    <span
      className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] ${active
        ? "border-cyan/40 text-cyan"
        : "border-lineBright text-faint"
        }`}
    >
      {status}
    </span>
  );
}
