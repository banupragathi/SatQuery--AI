import Navbar from "../components/landing/Navbar.jsx";
import Hero from "../components/landing/Hero.jsx";
import BigIdea from "../components/landing/BigIdea.jsx";
import HowItWorks from "../components/landing/HowItWorks.jsx";
import Capabilities from "../components/landing/Capabilities.jsx";
import Multimodal from "../components/landing/Multimodal.jsx";
import ChangeSection from "../components/landing/ChangeSection.jsx";
import FinalCTA from "../components/landing/FinalCTA.jsx";
import Footer from "../components/landing/Footer.jsx";

/*
  LandingPage.jsx
  ===============
  Composes the marketing page in narrative order. Each section lives in its own
  component so it can be iterated on independently.
*/
export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <BigIdea />
        <HowItWorks />
        <Capabilities />
        <Multimodal />
        <ChangeSection />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
