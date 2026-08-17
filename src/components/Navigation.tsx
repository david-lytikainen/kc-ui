type NavigationProps = {
  isAuthenticated: boolean;
  onGalleryClick: () => void;
  onCommissionClick: () => void;
  onHomeClick: () => void;
  onProfileClick: () => void;
  onLogoutClick: () => void;
};


export default function Navigation({ isAuthenticated, onGalleryClick, onCommissionClick, onHomeClick, onProfileClick, onLogoutClick }: NavigationProps) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "rgba(247, 241, 231, 0.86)", boxShadow: "0 10px 30px rgba(31, 51, 40, 0.08)", backdropFilter: "blur(8px)" }}>
      <button onClick={onHomeClick} style={{ border: 0, background: "transparent", color: "var(--leaf-900)", padding: 0, fontFamily: "var(--serif)", fontSize: "clamp(1.08rem, 3vw, 1.4rem)", fontWeight: 700 }}>Kyra&apos;s Creations</button>
      <nav style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 12 }}>
        <button onClick={onGalleryClick} style={{ border: 0, background: "transparent", color: "var(--leaf-800)", padding: 0, fontWeight: 700 }}>Gallery</button>
        <button onClick={onCommissionClick} style={{ border: 0, background: "transparent", color: "var(--leaf-800)", padding: 0, fontWeight: 700 }}>Commission</button>
        {isAuthenticated ? <button onClick={onProfileClick} style={{ border: 0, background: "transparent", color: "var(--leaf-800)", padding: 0, fontWeight: 700 }}>Profile</button> : null}
        {isAuthenticated ? <button onClick={onLogoutClick} style={{ border: 0, background: "transparent", color: "var(--leaf-800)", padding: 0, fontWeight: 700 }}>Logout</button> : null}
      </nav>
    </header>
  );
}
