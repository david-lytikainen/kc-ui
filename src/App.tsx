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

  const showHomeSection = (section: "gallery" | "commission") => {
    window.history.pushState({}, "", "/");
    setView("home");
    setOrderNumber("");
    setPendingScroll(section);
  };

  const showHome = () => {
    window.history.pushState({}, "", "/");
    setView("home");
    setOrderNumber("");
  };

  const showProfile = () => {
    window.history.pushState({}, "", "/admin/profile");
    setView("profile");
    setOrderNumber("");
  };

  const openOrder = (nextOrderNumber: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", `/order/${nextOrderNumber}`);
    setOrderNumber(nextOrderNumber);
    setView("order");
  };

  const handleAuthed = (nextToken: string, nextUser: User) => {
    setToken(nextToken);
    setUser(nextUser);
    setAuthError("");
    setView("profile");
    window.history.pushState({}, "", "/admin/profile");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    showHome();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#fff7f5", color: "#2f1712" }}>
      <Navigation
        isAuthenticated={Boolean(user)}
        onGalleryClick={() => showHomeSection("gallery")}
        onCommissionClick={() => showHomeSection("commission")}
        onHomeClick={showHome}
        onProfileClick={showProfile}
        onLogoutClick={handleLogout}
      />
      <main style={{ display: "grid", gap: 28, padding: 20, maxWidth: 560, margin: "0 auto" }}>
        {authError ? <p style={{ margin: 0, color: "#8f2d1d" }}>{authError}</p> : null}
        {view === "home" ? (
          <>
            <section style={{ display: "grid", gap: 14, paddingTop: 8 }}>
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", color: "#9c6f63" }}>Art commissions</p>
              <h1 style={{ margin: 0, fontSize: "2rem", lineHeight: 1.05 }}>A mobile-first home for Kyra’s gallery and commission requests.</h1>
              <p style={{ margin: 0, color: "#6a4b43", lineHeight: 1.5 }}>The current slices now include the public gallery, anonymous commission orders, and Kyra&apos;s admin profile tools for gallery and order management.</p>
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
        {view === "order" && orderNumber ? <OrderPage orderNumber={orderNumber} token={token} user={user} onBackHome={showHome} /> : null}
      </main>
    </div>
  );
}
