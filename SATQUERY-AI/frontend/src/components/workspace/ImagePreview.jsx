/*
  ImagePreview.jsx
  ================
  Shows the uploaded image plus its metadata. Browsers cannot render TIFF /
  GeoTIFF inside an <img>, so for those we show a clean placeholder tile while
  still displaying the real metadata the backend read with Pillow.
*/
function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ImagePreview({ meta, previewUrl, isTiff, onRemove }) {
  const rows = [
    { label: "File", value: meta?.filename || "—" },
    { label: "Format", value: meta?.format || "—" },
    {
      label: "Dimensions",
      value: meta?.width && meta?.height ? `${meta.width} × ${meta.height}` : "—",
    },
    { label: "Size", value: formatBytes(meta?.size_bytes) },
  ];

  return (
    <div className="panel overflow-hidden">
      <div className="relative aspect-[16/10] w-full bg-deep">
        {isTiff || !previewUrl ? (
          <div className="grid-overlay flex h-full w-full flex-col items-center justify-center text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="6" y="4" width="28" height="32" rx="3" stroke="#2a3b5c" />
              <path d="M12 14h16M12 20h16M12 26h10" stroke="#2aa7be" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
              {isTiff ? "TIFF preview unavailable in browser" : "No preview"}
            </p>
            <p className="mt-1 text-xs text-muted">Metadata read successfully</p>
          </div>
        ) : (
          <img
            src={previewUrl}
            alt={`Uploaded satellite image: ${meta?.filename || "scene"}`}
            className="h-full w-full object-cover"
          />
        )}

        <button
          onClick={onRemove}
          className="absolute right-3 top-3 rounded-md border border-lineBright bg-void/80 px-3 py-1.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted backdrop-blur transition-colors hover:border-amber hover:text-amber"
          aria-label="Remove image"
        >
          Remove
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-px bg-line">
        {rows.map((row) => (
          <div key={row.label} className="bg-panel px-4 py-3">
            <dt className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
              {row.label}
            </dt>
            <dd className="mt-1 truncate text-sm text-ink" title={String(row.value)}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
