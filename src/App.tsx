import { useRef } from "react";

import CommissionRequestForm from "./components/CommissionRequestForm";
import GalleryPreview from "./components/GalleryPreview";
import Navigation from "./components/Navigation";


export default function App() {
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const commissionRef = useRef<HTMLDivElement | null>(null);

  const scrollToSection = (section: HTMLDivElement | null) => {
    section?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff7f5", color: "#2f1712" }}>
      <Navigation onGalleryClick={() => scrollToSection(galleryRef.current)} onCommissionClick={() => scrollToSection(commissionRef.current)} />
      <main style={{ display: "grid", gap: 28, padding: 20, maxWidth: 560, margin: "0 auto" }}>
        <section style={{ display: "grid", gap: 14, paddingTop: 8 }}>
          <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Art commissions</p>
          <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.05 }}>A mobile-first home for Karen’s gallery and commission requests.</h1>
          <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>This skeleton keeps the first version narrow: public art browsing and a clean path into commission inquiries, with S3 and Stripe to be wired once those decisions are finalized.</p>
        </section>
        <div ref={galleryRef}>
          <GalleryPreview />
        </div>
        <div ref={commissionRef}>
          <CommissionRequestForm />
        </div>
      </main>
    </div>
  );
}
