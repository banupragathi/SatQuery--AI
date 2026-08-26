import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { checkHealth } from "../../services/api.js";

/*
  WorkspaceHeader.jsx
  ===================
  Top bar of the /app workspace. Shows the wordmark, a LIVE backend status
  indicator (it actually pings /health), and a "New analysis" button that
  resets the workspace.
*/
export default function WorkspaceHeader({ onReset }) {
  const [status, setStatus] = useState("checking"); // checking | online | offline

  useEffect(() => {
    let alive = true;
    checkHealth().then((res) => {
      if (alive) setStatus(res.ok ? "online" : "offline");
    });
    return () => {
      alive = false;
    };
  }, []);

  const statusMeta = {
    checking: { label: "Connecting…", color: "#8896b2" },
    online: { label: "System ready", color: "#4fd8ee" },
    offline: { label: "Backend offline", color: "#e8a64c" },
  }[status];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-center gap-3 sm:gap-4" aria-label="Back to SatQuery AI home">
          <img src="/logo.png" alt="SatQuery AI Logo" className="h-5 sm:h-7 w-auto object-contain" />
          <span className="hidden font-mono text-[0.58rem] sm:text-[0.62rem] uppercase tracking-[0.26em] text-faint sm:inline">
            Remote Sensing Intelligence
          </span>
        </Link>

        <div className="flex items-center gap-5">
          <span className="flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-muted">
            <span
              className="h-2 w-2 rounded-full pulse-dot"
              style={{ background: statusMeta.color, boxShadow: `0 0 8px ${statusMeta.color}` }}
            />
            {statusMeta.label}
          </span>
                    <Link to="/" className="btn-ghost px-4 py-2 text-[0.64rem]">
            Home
          </Link>
          <button onClick={onReset} className="btn-ghost px-4 py-2 text-[0.64rem]">
            New analysis
          </button>
        </div>
      </div>
    </header>
  );
}
