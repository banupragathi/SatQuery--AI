/*
  ResultPanel.jsx
  ===============

  Displays the structured result returned by /analyze.

  Supports:
  - VQA
  - Captioning
  - Grounding
  - BigEarthNet land-cover predictions

  The component only displays information actually returned by
  the backend. It does not invent confidence scores or answers.
*/

export default function ResultPanel({ result }) {
  if (!result) return null;

  const connected = result.model_connected;

  const facts = [
    {
      label: "Task",
      value: result.task || "—",
    },
    {
      label: "Question",
      value: result.query || "—",
    },
    {
      label: "Specialist",
      value: result.specialist || "—",
    },
    {
      label: "Model",
      value: result.model || "—",
    },
  ];

  const hasLandCoverPredictions =
    result.evidence?.type === "land_cover_scores" &&
    Array.isArray(result.evidence.predictions);

  return (
    <div className="panel overflow-hidden">
      {/* ============================================================
          HEADER
      ============================================================ */}
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
            connected
              ? "border-cyan/40 text-cyan"
              : "border-amber/40 text-amber"
          }`}
        >
          {connected ? "Model connected" : "Model pending"}
        </span>
      </div>

      {/* ============================================================
          FACTS
      ============================================================ */}
      <dl className="grid grid-cols-2 gap-px bg-line">
        {facts.map((fact) => (
          <div key={fact.label} className="bg-panel px-6 py-4">
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
              {fact.label}
            </dt>

            <dd className="mt-1 text-sm text-ink">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      {/* ============================================================
          ANSWER
      ============================================================ */}
      <div className="border-t border-line px-6 py-6">
        <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
          Answer
        </p>

        {connected && result.answer ? (
          <p className="text-base leading-relaxed text-ink">
            {result.answer}
          </p>
        ) : (
          <div className="rounded-xl border border-amber/30 bg-amber/[0.05] p-5">
            <p className="font-display text-base font-medium text-amber">
              AI model not connected yet
            </p>

            <p className="mt-2 text-sm leading-relaxed text-muted">
              {result.message || "AI model integration pending."}{" "}
              The full pipeline — routing, specialist selection and result
              formatting — is working end to end. A real remote-sensing
              model will be connected in the appropriate phase.
            </p>
          </div>
        )}
      </div>

      {/* ============================================================
          ROUTING REASON
      ============================================================ */}
      {result.routing_reason && (
        <div className="border-t border-line px-6 py-5">
          <p className="mb-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Why this task
          </p>

          <p className="text-sm leading-relaxed text-muted">
            {result.routing_reason}
          </p>
        </div>
      )}

      {/* ============================================================
          EXECUTION TRACE
      ============================================================ */}
      {Array.isArray(result.execution_trace) &&
        result.execution_trace.length > 0 && (
          <div className="border-t border-line px-6 py-5">
            <p className="mb-3 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
              Execution trace
            </p>

            <ol className="space-y-2">
              {result.execution_trace.map((row, index) => (
                <li key={index} className="flex gap-3 text-sm">
                  <span className="font-mono text-[0.7rem] text-cyanDim">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span className="text-muted">
                    <span className="text-ink">
                      {row.step}
                    </span>

                    {row.detail ? ` — ${row.detail}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

      {/* ============================================================
          CONFIDENCE + EVIDENCE
      ============================================================ */}
      <div className="grid grid-cols-2 gap-px border-t border-line bg-line">
        {/* Confidence */}
        <div className="bg-panel px-6 py-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Confidence
          </p>

                    {result.confidence ? (
            <div className="mt-1">
              <p className="text-sm font-semibold text-cyan">
                {result.confidence}
              </p>
              {/* Extract number from confidence string for progress bar */}
              {(() => {
                const match = String(result.confidence).match(/(\d+)/);
                const pct = match ? Math.min(100, Number(match[1])) : 0;
                return pct > 0 ? (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-deep">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: pct > 70 ? "#4FD8EE" : pct > 40 ? "#4C86F5" : "#E8A64C",
                      }}
                    />
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            <p className="mt-1 text-sm text-faint">
              {connected
                ? "Not available for this model"
                : "Available once a model is connected"}
            </p>
          )}
        </div>

        {/* Evidence */}
        <div className="bg-panel px-6 py-4">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
            Evidence
          </p>

          {result.evidence?.type === "bounding_box" ? (
            <p className="mt-1 text-sm text-cyan">
              Bounding box drawn on image
              {result.evidence.label
                ? ` — ${result.evidence.label}`
                : ""}
            </p>
          ) : result.evidence?.type === "land_cover_scores" ? (
            <p className="mt-1 text-sm text-cyan">
              Land-cover predictions shown below
            </p>
          ) : (
            <p className="mt-1 text-sm text-faint">
              Available once a model is connected
            </p>
          )}
        </div>
      </div>

      {/* ============================================================
          BIGEARTHNET LAND-COVER PREDICTIONS
      ============================================================ */}
      {hasLandCoverPredictions && (
        <div className="border-t border-line px-6 py-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
                Land-Cover Predictions
              </p>

              <p className="mt-1 text-xs text-muted">
                BigEarthNet remote-sensing specialist
              </p>
            </div>

            <span className="rounded-full border border-cyan/30 bg-cyan/5 px-3 py-1 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-cyan">
              19 classes
            </span>
          </div>

          <div className="space-y-4">
            {result.evidence.predictions.map((pred, index) => {
              const confidence = Number(pred.confidence) || 0;

              const percentage = Math.max(
                0,
                Math.min(100, confidence * 100)
              );

              return (
                <div key={`${pred.class}-${index}`}>
                  {/* Label + percentage */}
                  <div className="mb-1.5 flex items-baseline justify-between gap-4">
                    <span className="text-sm leading-relaxed text-ink">
                      {pred.class}
                    </span>

                    <span className="shrink-0 font-mono text-sm font-bold text-cyan">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2 w-full overflow-hidden rounded-full bg-deep">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${percentage}%`,
                        background:
                          confidence > 0.5
                            ? "#4FD8EE"
                            : confidence > 0.3
                            ? "#4C86F5"
                            : "#2AA7BE",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          MODEL METADATA
      ============================================================ */}
      {hasLandCoverPredictions &&
        result.evidence.model_metrics && (
          <div className="border-t border-line px-6 py-5">
            <p className="mb-4 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
              Model Performance
            </p>

            <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-line">
              <div className="bg-panel px-4 py-3">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                  Micro F1
                </p>

                <p className="mt-1 text-sm font-semibold text-ink">
                  {Number(
                    result.evidence.model_metrics.f1
                  ).toFixed(3)}
                </p>
              </div>

              <div className="bg-panel px-4 py-3">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                  Precision
                </p>

                <p className="mt-1 text-sm font-semibold text-ink">
                  {Number(
                    result.evidence.model_metrics.precision
                  ).toFixed(3)}
                </p>
              </div>

              <div className="bg-panel px-4 py-3">
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-faint">
                  Recall
                </p>

                <p className="mt-1 text-sm font-semibold text-ink">
                  {Number(
                    result.evidence.model_metrics.recall
                  ).toFixed(3)}
                </p>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}