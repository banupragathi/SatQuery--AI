import { useRef, useState } from "react";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader.jsx";
import ImageUpload from "../components/workspace/ImageUpload.jsx";
import ImagePreview from "../components/workspace/ImagePreview.jsx";
import QueryInput from "../components/workspace/QueryInput.jsx";
import ScanningState from "../components/workspace/ScanningState.jsx";
import ResultPanel from "../components/workspace/ResultPanel.jsx";
import { uploadImage, analyzeImage } from "../services/api.js";

/*
  Workspace.jsx
  =============
  The heart of /app. It owns the flow state and coordinates the components:

      idle  ->  (upload succeeds)  ->  ready
      ready ->  (analyse clicked)  ->  analyzing  ->  done

  The result is only revealed once BOTH the real /analyze response has arrived
  AND the scanning animation has finished, so the pacing feels intentional
  without ever faking the outcome.
*/
function isTiffFile(file) {
  const name = (file?.name || "").toLowerCase();
  return name.endsWith(".tif") || name.endsWith(".tiff") || file?.type === "image/tiff";
}

export default function Workspace() {
  const [phase, setPhase] = useState("idle"); // idle | ready | analyzing | done

  // upload state
  const [previewUrl, setPreviewUrl] = useState(null);
  const [tiff, setTiff] = useState(false);
  const [uploadMeta, setUploadMeta] = useState(null); // { image_id, filename, format, width, height, size_bytes }
  const [uploadError, setUploadError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // query + analysis state
  const [query, setQuery] = useState("");
  const [analyzeError, setAnalyzeError] = useState(null);
  const [result, setResult] = useState(null);

  // coordination between the network response and the scan animation
  const pendingRef = useRef(null);
  const scanDoneRef = useRef(false);

  const finalize = () => {
    if (scanDoneRef.current && pendingRef.current) {
      setResult(pendingRef.current);
      setPhase("done");
    }
  };

  const handleFile = async (file) => {
    setUploadError(null);
    setUploading(true);

    // local preview
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setTiff(isTiffFile(file));

    const res = await uploadImage(file);
    setUploading(false);

    if (!res.ok) {
      setUploadError(res.error);
      setPreviewUrl(null);
      setTiff(false);
      return;
    }
    setUploadMeta(res.data);
    setPhase("ready");
  };

  const handleSelectSample = async (path, filename) => {
    setUploadError(null);
    setUploading(true);

    try {
      const response = await fetch(path);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setTiff(isTiffFile(file));

      const res = await uploadImage(file);
      setUploading(false);

      if (!res.ok) {
        setUploadError(res.error);
        setPreviewUrl(null);
        setTiff(false);
        return;
      }
      setUploadMeta(res.data);
      setPhase("ready");
    } catch (err) {
      setUploading(false);
      setUploadError("Failed to load sample image: " + err.message);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPhase("idle");
    setPreviewUrl(null);
    setTiff(false);
    setUploadMeta(null);
    setUploadError(null);
    setQuery("");
    setAnalyzeError(null);
    setResult(null);
    pendingRef.current = null;
    scanDoneRef.current = false;
  };

  const handleAnalyze = async () => {
    if (!uploadMeta) {
      setAnalyzeError("Upload an image first.");
      return;
    }
    if (!query.trim()) {
      setAnalyzeError("Type a question first.");
      return;
    }

    setAnalyzeError(null);
    setResult(null);
    pendingRef.current = null;
    scanDoneRef.current = false;
    setPhase("analyzing");

    const res = await analyzeImage(uploadMeta.image_id, query.trim());
    if (!res.ok) {
      setAnalyzeError(res.error);
      setPhase("ready");
      return;
    }
    pendingRef.current = res.data;
    finalize();
  };

  const handleScanComplete = () => {
    scanDoneRef.current = true;
    finalize();
  };

  const canAnalyze = phase !== "analyzing" && !!uploadMeta && !!query.trim();

  return (
    <div className="min-h-screen">
      <WorkspaceHeader onReset={handleReset} />

      <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-8">
          <p className="eyebrow mb-2">Workspace</p>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Ask your satellite imagery
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* LEFT: input column */}
          <div className="space-y-6">
            {phase === "idle" ? (
              <ImageUpload
                onFile={handleFile}
                onSelectSample={handleSelectSample}
                disabled={uploading}
                error={uploadError}
              />
            ) : (
              <>
                <ImagePreview
                  meta={uploadMeta}
                  previewUrl={previewUrl}
                  isTiff={tiff}
                  onRemove={handleReset}
                  groundingBox={result?.evidence?.type === "bounding_box" ? result.evidence : null}
                />

                <div className="panel p-6">
                  <QueryInput
                    value={query}
                    onChange={setQuery}
                    onExample={setQuery}
                    disabled={phase === "analyzing"}
                  />

                  <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    className="btn-primary mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === "analyzing" ? "Analysing…" : "Analyze image"}
                    {phase !== "analyzing" && <span aria-hidden="true">→</span>}
                  </button>

                  {analyzeError && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-amber" role="alert">
                      <span aria-hidden="true">▲</span>
                      {analyzeError}
                    </p>
                  )}
                </div>
              </>
            )}

            {uploading && (
              <p className="font-mono text-[0.64rem] uppercase tracking-[0.16em] text-cyanDim">
                Uploading & validating…
              </p>
            )}
          </div>

          {/* RIGHT: output column */}
          <div>
              {phase === "analyzing" && (
              <ScanningState
                onComplete={handleScanComplete}
                previewUrl={previewUrl}
                isTiff={tiff}
              />
            )}
            {phase === "done" && <ResultPanel result={result} />}
            {(phase === "idle" || phase === "ready") && <IdleHint ready={phase === "ready"} />}
          </div>
        </div>
      </main>
    </div>
  );
}

// A calm placeholder for the output column before an analysis runs.
function IdleHint({ ready }) {
  return (
    <div className="panel flex min-h-[340px] flex-col items-center justify-center p-10 text-center">
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none" aria-hidden="true">
        <circle cx="22" cy="22" r="21" stroke="#2a3b5c" />
        <circle cx="22" cy="22" r="10" stroke="#2aa7be" />
        <circle cx="22" cy="22" r="2.5" fill="#4fd8ee" />
        <line x1="22" y1="1" x2="22" y2="8" stroke="#2a3b5c" />
        <line x1="22" y1="36" x2="22" y2="43" stroke="#2a3b5c" />
        <line x1="1" y1="22" x2="8" y2="22" stroke="#2a3b5c" />
        <line x1="36" y1="22" x2="43" y2="22" stroke="#2a3b5c" />
      </svg>
      <p className="mt-5 font-display text-lg font-medium text-ink">
        {ready ? "Ask a question to begin" : "Upload an image to begin"}
      </p>
      <p className="mt-2 max-w-xs text-sm text-muted">
        {ready
          ? "Type a question or pick an example, then run the analysis. Results appear here."
          : "Your analysis results, routing and execution trace will appear in this panel."}
      </p>
    </div>
  );
}
