type NavigationProps = {
  onGalleryClick: () => void;
  onCommissionClick: () => void;
};


export default function Navigation({ onGalleryClick, onCommissionClick }: NavigationProps) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(255, 247, 245, 0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #ead9d2" }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, letterSpacing: 0 }}>Kyra&apos;s Creations</div>
      <nav style={{ display: "flex", gap: 12 }}>
        <button onClick={onGalleryClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Gallery</button>
        <button onClick={onCommissionClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Commission</button>
      </nav>
    </header>
  );
}
