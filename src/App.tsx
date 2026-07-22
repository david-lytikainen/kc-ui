import { useEffect, useRef, useState } from "react";

import { authApi, User } from "./api";
import AuthPanel from "./components/AuthPanel";
import CommissionRequestForm from "./components/CommissionRequestForm";
import GalleryPreview from "./components/GalleryPreview";
import Navigation from "./components/Navigation";
import ProfilePage from "./components/ProfilePage";


export default function App() {
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const commissionRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<"home" | "login" | "signup" | "profile">("home");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState("");
  const [galleryRefreshToken, setGalleryRefreshToken] = useState(0);
  const [pendingScroll, setPendingScroll] = useState<"gallery" | "commission" | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) {
      return;
    }

    async function hydrateSession() {
      try {
        const nextUser = await authApi.validateToken(storedToken);
        setToken(storedToken);
        setUser(nextUser);
      } catch (nextError) {
        localStorage.removeItem("token");
        setAuthError(nextError instanceof Error ? nextError.message : "Unable to restore session.");
      }
    }

    void hydrateSession();
  }, []);

  useEffect(() => {
    if (view !== "home" || !pendingScroll) {
      return;
    }

    const target = pendingScroll === "gallery" ? galleryRef.current : commissionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScroll(null);
  }, [pendingScroll, view]);

  const showHomeSection = (section: "gallery" | "commission") => {
    setView("home");
    setPendingScroll(section);
  };

  const handleAuthed = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthError("");
    setView("profile");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setView("home");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff7f5", color: "#2f1712" }}>
      <Navigation
        isAuthenticated={Boolean(user)}
        onGalleryClick={() => showHomeSection("gallery")}
        onCommissionClick={() => showHomeSection("commission")}
        onHomeClick={() => setView("home")}
        onProfileClick={() => setView("profile")}
        onLoginClick={() => setView("login")}
        onSignupClick={() => setView("signup")}
        onLogoutClick={handleLogout}
      />
      <main style={{ display: "grid", gap: 28, padding: 20, maxWidth: 560, margin: "0 auto" }}>
        {authError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{authError}</p> : null}
        {view === "home" ? (
          <>
            <section style={{ display: "grid", gap: 14, paddingTop: 8 }}>
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Art commissions</p>
              <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.05 }}>A mobile-first home for Kyra’s gallery and commission requests.</h1>
              <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>The first real slices now include the public gallery plus Kyra&apos;s private admin profile path for gallery management and drag-drop ordering.</p>
            </section>
            <div ref={galleryRef}>
              <GalleryPreview refreshToken={galleryRefreshToken} />
            </div>
            <div ref={commissionRef}>
              <CommissionRequestForm />
            </div>
          </>
        ) : null}
        {view === "login" ? <AuthPanel mode="login" onAuthed={handleAuthed} /> : null}
        {view === "signup" ? <AuthPanel mode="signup" onAuthed={handleAuthed} /> : null}
        {view === "profile" && user && token ? <ProfilePage token={token} user={user} onUserChange={setUser} onGalleryChanged={() => setGalleryRefreshToken((current) => current + 1)} /> : null}
      </main>
    </div>
  );
}
