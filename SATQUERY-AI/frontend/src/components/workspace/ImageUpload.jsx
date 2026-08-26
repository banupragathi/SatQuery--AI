import { useRef, useState } from "react";

const ACCEPT = ".png,.jpg,.jpeg,.tif,.tiff,image/png,image/jpeg,image/tiff";
const SAMPLES = [
  { name: "optical-hero.jpg", label: "Urban Area (Optical)", path: "/samples/optical-hero.jpg" },
  { name: "optical-pair.jpg", label: "Agricultural Fields", path: "/samples/optical-pair.jpg" },
  { name: "sar-pair.jpg", label: "Coastal Sensor (SAR)", path: "/samples/sar-pair.jpg" }
];

export default function ImageUpload({ files = [], onFilesChange, onSelectSample, disabled, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handlePick = (newFiles) => {
    if (disabled || !newFiles) return;
    const array = Array.from(newFiles);
    // Prevent duplicates by checking name and size
    const uniqueFiles = array.filter(
      (nf) => !files.some((f) => f.name === nf.name && f.size === nf.size)
    );
    if (uniqueFiles.length > 0) {
      onFilesChange([...files, ...uniqueFiles]);
    }
    
    // Clear input value so selecting the same file again triggers onChange
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    handlePick(e.dataTransfer.files);
  };

  const handleRemove = (idxToRemove) => {
    if (disabled) return;
    onFilesChange(files.filter((_, idx) => idx !== idxToRemove));
  };

  if (files.length > 0) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {files.map((file, i) => {
            const url = URL.createObjectURL(file);
            return (
              <div key={file.name + file.size + i} className="relative aspect-square w-full rounded-xl overflow-hidden border border-lineBright bg-deep">
                <img src={url} className="w-full h-full object-cover" alt="preview" />
                <button
                  type="button"
                  disabled={disabled}
                  className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-void/80 text-xs text-muted transition-colors hover:bg-void hover:text-amber disabled:opacity-50"
                  onClick={() => handleRemove(i)}
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-lineBright bg-panel/40 text-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-2xl">+</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            disabled={disabled}
            onChange={(e) => handlePick(e.target.files)}
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
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true">
          <circle cx="23" cy="23" r="22" stroke="#2a3b5c" />
          <path d="M23 31V16M23 16l-6 6M23 16l6 6" stroke="#4fd8ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <p className="mt-6 font-display text-lg font-medium text-ink">
          Upload satellite imagery
        </p>
        <p className="mt-2 text-sm text-muted">Drop images here or browse files</p>
        <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
          PNG · JPEG · TIFF · GeoTIFF
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          disabled={disabled}
          onChange={(e) => handlePick(e.target.files)}
        />
      </div>

      {onSelectSample && (
        <div className="mt-6">
          <p className="mb-3 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-cyanDim">
            Or analyze a pre-loaded sample
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {SAMPLES.map((sample) => (
              <button
                key={sample.name}
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectSample(sample.path, sample.name);
                }}
                className="flex items-center gap-3 rounded-xl border border-lineBright bg-panel/30 p-2.5 text-left transition-colors hover:border-cyan/50 hover:bg-panel/60 disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-deep">
                  <img src={sample.path} alt={sample.label} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.76rem] font-medium text-ink truncate">{sample.label}</p>
                  <p className="font-mono text-[0.52rem] text-faint uppercase tracking-wider mt-0.5">Click to load</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-amber" role="alert">
          <span aria-hidden="true">▲</span>
          {error}
        </p>
      )}
    </div>
  );
}
