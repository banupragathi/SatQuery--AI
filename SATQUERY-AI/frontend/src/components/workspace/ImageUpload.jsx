import { useRef, useState } from "react";

/*
  ImageUpload.jsx
  ===============
  Large drag-and-drop upload area with a keyboard-accessible browse button.
  It only handles PICKING a file and passing it up; the actual upload request
  happens in the Workspace page (so this component stays presentational).

  Accepts PNG / JPEG / TIFF / GeoTIFF. Single image for now; the layout leaves
  room to add multi-image input later without a redesign.
*/
const ACCEPT = ".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff";

export default function ImageUpload({ onFile, disabled, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const pick = (file) => {
    if (file && !disabled) onFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    pick(file);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload satellite imagery. Drop an image here or press Enter to browse files."
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`grid-overlay flex min-h-[340px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging
            ? "border-cyan bg-cyan/[0.06]"
            : "border-lineBright bg-panel/40 hover:border-cyan/60"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        {/* upload glyph */}
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
          <circle cx="23" cy="23" r="22" stroke="#2a3b5c" />
          <path d="M23 31V16M23 16l-6 6M23 16l6 6" stroke="#4fd8ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <p className="mt-6 font-display text-lg font-medium text-ink">
          Upload satellite imagery
        </p>
        <p className="mt-2 text-sm text-muted">Drop an image here or browse files</p>
        <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
          PNG · JPEG · TIFF · GeoTIFF
        </p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber" role="alert">
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      )}
    </div>
  );
}
