import { Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage.jsx";
import Workspace from "./pages/Workspace.jsx";

// Two routes:
//   /      -> the premium marketing landing page
//   /app   -> the SatQuery AI workspace (upload, ask, analyse)
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/app" element={<Workspace />} />
    </Routes>
  );
}
