import { useEffect, useRef, useState } from "react";

import { authApi, User } from "./api";
import AuthPanel from "./components/AuthPanel";
import CommissionRequestForm from "./components/CommissionRequestForm";
import GalleryPreview from "./components/GalleryPreview";
import Navigation from "./components/Navigation";
import OrderPage from "./components/OrderPage";
import ProfilePage from "./components/ProfilePage";


type AppView = "home" | "login" | "profile" | "order";


function parseRoute(): { view: AppView; orderNumber: string } {
  if (window.location.pathname === "/admin" || window.location.pathname === "/admin/sign-in") {
    return { view: "login", orderNumber: "" };
  }

  if (window.location.pathname === "/admin/profile") {
    return { view: "profile", orderNumber: "" };
  }

  const match = window.location.pathname.match(/^\/order\/(\d{6})\/?$/);
  if (match) {
    return { view: "order", orderNumber: match[1] };
  }

  return { view: "home", orderNumber: "" };
}


export default function App() {
  const initialRoute = parseRoute();
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const commissionRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<AppView>(initialRoute.view);
  const [orderNumber, setOrderNumber] = useState(initialRoute.orderNumber);
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
    const sessionToken = storedToken;

    async function hydrateSession() {
      try {
        const nextUser = await authApi.validateToken(sessionToken);
        setToken(sessionToken);
        setUser(nextUser);
      } catch (nextError) {
        localStorage.removeItem("token");
        setAuthError(nextError instanceof Error ? nextError.message : "Unable to restore session.");
      }
    }

    void hydrateSession();
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = parseRoute();
      setView(nextRoute.view);
      setOrderNumber(nextRoute.orderNumber);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!user || view !== "login") {
      return;
    }

    window.history.replaceState({}, "", "/admin/profile");
    setView("profile");
  }, [user, view]);

  useEffect(() => {
    if (view !== "home" || !pendingScroll) {
      return;
    }

    const target = pendingScroll === "gallery" ? galleryRef.current : commissionRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScroll(null);
  }, [pendingScroll, view]);

  const showHome = (section: "gallery" | "commission" | null = null) => {
    window.history.pushState({}, "", "/");
    setView("home");
    setOrderNumber("");
    setPendingScroll(section);
  };

  const showProfile = () => {
    window.history.pushState({}, "", "/admin/profile");
    setView("profile");
    setOrderNumber("");
  };

  const openOrder = (nextOrderNumber: string) => {
    window.history.pushState({}, "", `/order/${nextOrderNumber}`);
    setOrderNumber(nextOrderNumber);
    setView("order");
  };

  const handleAuthed = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthError("");
    showProfile();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    showHome();
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navigation
        isAuthenticated={Boolean(user)}
        onGalleryClick={() => showHome("gallery")}
        onCommissionClick={() => showHome("commission")}
        onHomeClick={showHome}
        onProfileClick={showProfile}
        onLogoutClick={handleLogout}
      />
      <main style={{ display: "grid", gap: "clamp(22px, 4vw, 42px)", width: "min(100%, 1120px)", margin: "0 auto", padding: "22px clamp(16px, 4vw, 34px) 56px" }}>
        {authError ? <p style={{ margin: 0, color: "var(--danger)" }}>{authError}</p> : null}
        {view === "home" ? (
          <>
            <section aria-label="Kyra's Creations" style={{ position: "relative", minHeight: "clamp(520px, 78vh, 720px)", overflow: "hidden", display: "grid", alignItems: "end", borderRadius: "0 0 28px 28px", backgroundImage: "linear-gradient(90deg, rgba(31, 51, 40, 0.78) 0%, rgba(31, 51, 40, 0.48) 38%, rgba(31, 51, 40, 0.08) 72%), url('/assets/nature-studio-hero.png')", backgroundPosition: "center", backgroundSize: "cover", boxShadow: "var(--shadow)" }}>
              <div style={{ display: "grid", gap: 18, maxWidth: 620, padding: "clamp(28px, 7vw, 72px)", color: "var(--paper)" }}>
                <p style={{ margin: 0, color: "var(--leaf-200)", fontSize: "0.82rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase" }}>Custom artwork</p>
                <h1 style={{ margin: 0, fontFamily: "var(--serif)", fontSize: "clamp(3.4rem, 11vw, 7.4rem)", lineHeight: 0.88, fontWeight: 500 }}>Kyra&apos;s Creations <span style={{ display: "block", color: "var(--hero-soft)", fontFamily: "var(--script)", fontSize: "clamp(1.7rem, 6vw, 3rem)", fontWeight: 400 }}>a peaceful place</span></h1>
                <p style={{ maxWidth: "36rem", margin: 0, color: "var(--cream-soft)", fontFamily: "var(--serif)", fontSize: "clamp(1.12rem, 2.4vw, 1.42rem)", lineHeight: 1.55 }}>Custom pieces shaped with care, color, and the quiet feeling of stepping into a place that lets you breathe.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                  <button type="button" onClick={() => showHome("commission")} style={{ border: "1px solid var(--leaf-800)", borderRadius: 8, padding: "14px 16px", background: "var(--leaf-800)", color: "var(--paper)", fontWeight: 800, boxShadow: "0 12px 28px rgba(31, 51, 40, 0.18)" }}>Request a commission</button>
                  <button type="button" onClick={() => showHome("gallery")} style={{ border: "1px solid rgba(255, 253, 248, 0.42)", borderRadius: 8, padding: "14px 16px", background: "rgba(255, 253, 248, 0.14)", color: "var(--paper)", fontWeight: 800, backdropFilter: "blur(8px)" }}>View gallery</button>
                </div>
              </div>
            </section>
            <div ref={galleryRef}>
              <GalleryPreview refreshToken={galleryRefreshToken} />
            </div>
            <div ref={commissionRef}>
              <CommissionRequestForm onOrderCreated={(nextOrderNumber) => openOrder(nextOrderNumber)} />
            </div>
          </>
        ) : null}
        {view === "login" || (view === "profile" && (!user || !token)) ? <AuthPanel onAuthed={handleAuthed} /> : null}
        {view === "profile" && user && token ? <ProfilePage token={token} user={user} onUserChange={setUser} onGalleryChanged={() => setGalleryRefreshToken((current) => current + 1)} onOpenOrder={(nextOrderNumber) => openOrder(nextOrderNumber)} /> : null}
        {view === "order" && orderNumber ? <OrderPage orderNumber={orderNumber} token={token} onBackHome={showHome} /> : null}
      </main>
    </div>
  );
}
