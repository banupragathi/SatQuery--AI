import { useRef, useState } from "react";
import WorkspaceHeader from "../components/workspace/WorkspaceHeader.jsx";
import ImageUpload from "../components/workspace/ImageUpload.jsx";
import ImagePreview from "../components/workspace/ImagePreview.jsx";
import QueryInput from "../components/workspace/QueryInput.jsx";
import ScanningState from "../components/workspace/ScanningState.jsx";
import ResultPanel from "../components/workspace/ResultPanel.jsx";
import { uploadImage, analyzeImage } from "../services/api.js";

function isTiffFile(file) {
  const name = (file?.name || "").toLowerCase();
  return name.endsWith(".tif") || name.endsWith(".tiff") || file?.type === "image/tiff";
}

export default function Workspace() {
  const [phase, setPhase] = useState("idle"); // idle | ready | analyzing | done

  const [files, setFiles] = useState([]);
  const [uploadError, setUploadError] = useState(null);
  
  const [query, setQuery] = useState("");
  const [analyzeError, setAnalyzeError] = useState(null);
  
  const [results, setResults] = useState([]);
  const pendingRef = useRef(null);
  const scanDoneRef = useRef(false);

  const finalize = () => {
    if (scanDoneRef.current && pendingRef.current) {
      setResults(pendingRef.current);
      setPhase("done");
    }
  };

  const handleFilesChange = (newFiles) => {
    setFiles(newFiles);
    setUploadError(null);
    if (newFiles.length > 0 && phase === 'idle') {
      setPhase('ready');
    } else if (newFiles.length === 0) {
      setPhase('idle');
      setResults([]);
    }
  };

  const handleSelectSample = async (path, filename) => {
    try {
      const response = await fetch(path);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
      handleFilesChange([...files, file]);
    } catch (err) {
      setUploadError("Failed to load sample image: " + err.message);
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setFiles([]);
    setUploadError(null);
    setQuery("");
    setAnalyzeError(null);
    setResults([]);
    pendingRef.current = null;
    scanDoneRef.current = false;
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setAnalyzeError("Upload an image first.");
      return;
    }
    if (!query.trim()) {
      setAnalyzeError("Type a question first.");
      return;
    }

    setAnalyzeError(null);
    setResults([]);
    pendingRef.current = null;
    scanDoneRef.current = false;
    setPhase("analyzing");

    const newResults = [];
    for (const file of files) {
      // 1. Upload
      const ul = await uploadImage(file);
      if (!ul.ok) {
        setAnalyzeError(`Upload failed for ${file.name}: ${ul.error}`);
        setPhase("ready");
        return;
      }
      
      // 2. Analyze
      const res = await analyzeImage(ul.data.image_id, query.trim());
      if (!res.ok) {
        setAnalyzeError(`Analyse failed for ${file.name}: ${res.error}`);
        setPhase("ready");
        return;
      }
      
      newResults.push({
        file,
        meta: ul.data,
        result: res.data,
        previewUrl: URL.createObjectURL(file), // temporary local URL
        isTiff: isTiffFile(file)
      });
    }

    pendingRef.current = newResults;
    finalize();
  };

  const handleScanComplete = () => {
    scanDoneRef.current = true;
    finalize();
  };

  const canAnalyze = phase !== "analyzing" && files.length > 0 && !!query.trim();

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
            <ImageUpload
              files={files}
              onFilesChange={handleFilesChange}
              onSelectSample={handleSelectSample}
              disabled={phase === "analyzing"}
              error={uploadError}
            />

            {(phase === "ready" || phase === "analyzing" || phase === "done") && files.length > 0 && (
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
                  {phase === "analyzing" ? "Analysing…" : "Analyze all selected images"}
                  {phase !== "analyzing" && <span aria-hidden="true">→</span>}
                </button>

                {analyzeError && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-amber" role="alert">
                    <span aria-hidden="true">▲</span>
                    {analyzeError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: output column */}
          <div className="space-y-6">
            {phase === "analyzing" && (
              <ScanningState
                onComplete={handleScanComplete}
                previewUrl={files.length > 0 ? URL.createObjectURL(files[0]) : null}
                isTiff={files.length > 0 ? isTiffFile(files[0]) : false}
              />
            )}
            
            {phase === "done" && results.map((item, i) => (
              <div key={i} className="space-y-4 mb-10 last:mb-0">
                <ImagePreview
                  meta={item.meta}
                  previewUrl={item.previewUrl}
                  isTiff={item.isTiff}
                  onRemove={() => {}}
                  groundingBox={item.result?.evidence?.type === "bounding_box" ? item.result.evidence : null}
                />
                <ResultPanel result={item.result} />
              </div>
            ))}
            
            {(phase === "idle" || phase === "ready") && <IdleHint ready={phase === "ready"} />}
          </div>
        </div>
      </main>
    </div>
  );
}

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
