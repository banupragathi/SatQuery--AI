import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Workspace from "./pages/Workspace.jsx";

// ScrollToTop resets the window viewport to the top on every route change
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Reset to top coordinate instantly on router navigation
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}

// Two routes:
//   /      -> the premium marketing landing page
//   /app   -> the SatQuery AI workspace (upload, ask, analyse)
export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<Workspace />} />
      </Routes>
    </>
  );
}
