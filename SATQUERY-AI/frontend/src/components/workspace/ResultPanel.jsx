/*
  ResultPanel.jsx
  ===============
  Shows the structured result returned by /analyze. Crucially, when no model is
  connected (the current phase), it says so PLAINLY instead of inventing an
  answer. The execution trace is real information the backend reported about
  what it actually did.
*/
export default function ResultPanel({ result }) {
  if (!result) return null;

  const connected = result.model_connected;

  const facts = [
    { label: "Task", value: result.task },
    { label: "Question", value: result.query },
    { label: "Specialist", value: result.specialist || "—" },
    { label: "Model", value: result.model || "—" },
  ];

  return (
    <div className="panel overflow-hidden">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-cyan bg-cyan/10 text-xs text-cyan">
            ✓
          </span>
          <span className="font-mono text-[0.68rem] uppercase tracking-[0.2em] text-cyan">
            Analysis complete
          </span>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] ${
            connected ? "border-cyan/40 text-cyan" : "border-amber/40 text-amber"
          }`}
        >
          {connected ? "Model connected" : "Model pending"}
        </span>
      </div>

      {/* facts */}
      <dl className="grid grid-cols-2 gap-px bg-line">
        {facts.map((f) => (
          <div key={f.label} className="bg-panel px-6 py-4">
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
              {f.label}
            </dt>
            <dd className="mt-1 text-sm text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>

      {/* answer / pending state */}
      <div className="border-t border-line px-6 py-6">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
          Answer
        </p>

        {connected && result.answer ? (
          <p className="text-base leading-relaxed text-ink">{result.answer}</p>
        ) : (
          <div className="rounded-xl border border-amber/30 bg-amber/[0.05] p-5">
            <p className="font-display text-base font-medium text-amber">
              AI model not connected yet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {result.message || "AI model integration pending."} The full
              pipeline — routing, specialist selection and result formatting — is
              working end to end. A real remote-sensing vision-language model
              will be connected in a later phase, at which point the answer
              appears here.
            </p>
          </div>
        )}
      </div>

      {/* routing reason */}
      {result.routing_reason && (
        <div className="border-t border-line px-6 py-5">
          <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Why this task
          </p>
          <p className="text-sm leading-relaxed text-muted">{result.routing_reason}</p>
        </div>
      )}

      {/* execution trace (real backend data) */}
      {Array.isArray(result.execution_trace) && result.execution_trace.length > 0 && (
        <div className="border-t border-line px-6 py-5">
          <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Execution trace
          </p>
          <ol className="space-y-2">
            {result.execution_trace.map((row, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-[0.7rem] text-cyanDim">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-muted">
                  <span className="text-ink">{row.step}</span>
                  {row.detail ? ` — ${row.detail}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* placeholders for future signal, clearly labelled */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
                <div className="bg-panel px-6 py-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Evidence
          </p>
          {result.evidence?.type === "bounding_box" ? (
            <p className="mt-1 text-sm text-cyan">
              Bounding box drawn on image{result.evidence.label ? ` — ${result.evidence.label}` : ""}
            </p>
          ) : (
            <p className="mt-1 text-sm text-faint">Available once a model is connected</p>
          )}
        </div>
      </div>
    </div>
  );
}
