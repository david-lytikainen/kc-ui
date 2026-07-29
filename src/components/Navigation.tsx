type NavigationProps = {
  isAuthenticated: boolean;
  onGalleryClick: () => void;
  onCommissionClick: () => void;
  onHomeClick: () => void;
  onProfileClick: () => void;
  onLoginClick: () => void;
  onLogoutClick: () => void;
};


export default function Navigation({ isAuthenticated, onGalleryClick, onCommissionClick, onHomeClick, onProfileClick, onLoginClick, onLogoutClick }: NavigationProps) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "rgba(255, 247, 245, 0.95)", backdropFilter: "blur(8px)", borderBottom: "1px solid #ead9d2" }}>
      <button onClick={onHomeClick} style={{ border: "none", background: "transparent", padding: 0, color: "#2f1712", fontSize: "1rem", fontWeight: 700, letterSpacing: 0, cursor: "pointer" }}>Kyra&apos;s Creations</button>
      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
        <button onClick={onGalleryClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Gallery</button>
        <button onClick={onCommissionClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Commission</button>
        {isAuthenticated ? <button onClick={onProfileClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Profile</button> : <button onClick={onLoginClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Admin Sign In</button>}
        {isAuthenticated ? <button onClick={onLogoutClick} style={{ border: "none", background: "transparent", padding: 0, color: "#6a4b43", fontWeight: 600, cursor: "pointer" }}>Logout</button> : null}
      </nav>
    </header>
  );
}
