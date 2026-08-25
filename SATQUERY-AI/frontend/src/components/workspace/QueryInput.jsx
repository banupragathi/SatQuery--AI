/*
  QueryInput.jsx
  ==============
  Where the user types a natural-language question. Includes a few example
  queries as clickable chips -- tapping one fills the field, which lowers the
  barrier for a first-time user and shows the kinds of questions that route to
  different specialists (VQA vs CAPTION).
*/
const EXAMPLES = [
  "Is there a water body?",
  "Describe this image.",
  "What type of land cover is visible?",
  "Are there major built-up areas?",
];

export default function QueryInput({ value, onChange, onExample, disabled }) {
  return (
    <div>
      <label
        htmlFor="query"
        className="mb-3 block font-mono text-[0.64rem] uppercase tracking-[0.2em] text-cyanDim"
      >
        Ask SatQuery
      </label>

      <textarea
        id="query"
        rows={3}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ask a question about this image…"
        className="w-full resize-none rounded-xl border border-line bg-panel/60 px-4 py-3.5 text-sm text-ink placeholder:text-faint focus:border-cyan focus:outline-none disabled:opacity-60"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            disabled={disabled}
            onClick={() => onExample(ex)}
            className="rounded-full border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-cyan/60 hover:text-cyan disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
