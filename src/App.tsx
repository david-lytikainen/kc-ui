import { useEffect, useRef, useState } from "react";
import { authApi, User } from "./api";
import AuthPanel from "./components/AuthPanel";
import CommissionRequestForm from "./components/CommissionRequestForm";
import GalleryItemPage from "./components/GalleryItemPage";
import GalleryPage from "./components/GalleryPage";
import GalleryPreview from "./components/GalleryPreview";
import Navigation from "./components/Navigation";
import OrderPage from "./components/OrderPage";
import ProfilePage from "./components/ProfilePage";

type AppView = "home" | "gallery" | "gallery_item" | "login" | "profile" | "order";

function parseRoute(): { view: AppView; orderNumber: string; galleryItemId: number | null } {
  const pathname = window.location.pathname;
  if (pathname === "/admin") {
    return { view: "login", orderNumber: "", galleryItemId: null };
  }

  if (pathname === "/admin/profile") {
    return { view: "profile", orderNumber: "", galleryItemId: null };
  }

  if (pathname === "/gallery") {
    return { view: "gallery", orderNumber: "", galleryItemId: null };
  }

  const galleryMatch = pathname.match(/^\/gallery\/(\d+)\/?$/);
  if (galleryMatch) {
    return { view: "gallery_item", orderNumber: "", galleryItemId: Number(galleryMatch[1]) };
  }

  const match = pathname.match(/^\/order\/(\d{6})\/?$/);
  if (match) {
    return { view: "order", orderNumber: match[1], galleryItemId: null };
  }

  return { view: "home", orderNumber: "", galleryItemId: null };
}


export default function App() {
  const initialRoute = parseRoute();
  const galleryRef = useRef<HTMLDivElement | null>(null);
  const commissionRef = useRef<HTMLDivElement | null>(null);
  const [view, setView] = useState<AppView>(initialRoute.view);
  const [orderNumber, setOrderNumber] = useState(initialRoute.orderNumber);
  const [galleryItemId, setGalleryItemId] = useState<number | null>(initialRoute.galleryItemId);
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
      setGalleryItemId(nextRoute.galleryItemId);
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
    setGalleryItemId(null);
    setPendingScroll(section);
  };

  const showProfile = () => {
    window.history.pushState({}, "", "/admin/profile");
    setView("profile");
    setOrderNumber("");
    setGalleryItemId(null);
  };

  const showFullGallery = () => {
    window.history.pushState({}, "", "/gallery");
    setView("gallery");
    setOrderNumber("");
    setGalleryItemId(null);
    setPendingScroll(null);
  };

  const openGalleryItem = (itemId: number) => {
    window.history.pushState({}, "", `/gallery/${itemId}`);
    setGalleryItemId(itemId);
    setOrderNumber("");
    setView("gallery_item");
  };

  const openOrder = (nextOrderNumber: string) => {
    window.history.pushState({}, "", `/order/${nextOrderNumber}`);
    setOrderNumber(nextOrderNumber);
    setGalleryItemId(null);
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
    <div className="min-vh-100">
      <Navigation
        isAuthenticated={Boolean(user)}
        onGalleryClick={showFullGallery}
        onCommissionClick={() => showHome("commission")}
        onHomeClick={showHome}
        onProfileClick={showProfile}
      />
      <main className="container py-4 py-md-5">
        {authError ? <p className="text-danger mb-4">{authError}</p> : null}
        {view === "home" ? (
          <div className="d-grid gap-5">
            <section aria-label="Kyra's Creations" className="hero rounded-bottom-4 d-flex align-items-end">
              <div className="text-light p-4 p-md-5">
                <h1 className="hero-title">Kyra&apos;s Creations</h1>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <button className="btn btn-primary" type="button" onClick={() => showHome("commission")}>Request a commission</button>
                  <button className="btn btn-outline-light" type="button" onClick={showFullGallery}>View gallery</button>
                </div>
              </div>
            </section>
            <div ref={galleryRef} className="scroll-target">
              <GalleryPreview refreshToken={galleryRefreshToken} onOpenFullGallery={showFullGallery} onOpenItem={openGalleryItem} onOpenOrder={openOrder} />
            </div>
            <div ref={commissionRef} className="scroll-target">
              <CommissionRequestForm onOrderCreated={openOrder} />
            </div>
          </div>
        ) : null}
        {view === "gallery" ? <GalleryPage onOpenItem={openGalleryItem} onOpenOrder={openOrder} /> : null}
        {view === "gallery_item" && galleryItemId !== null ? <GalleryItemPage itemId={galleryItemId} onBackToGallery={showFullGallery} onOpenOrder={openOrder} /> : null}
        {view === "login" || (view === "profile" && (!user || !token)) ? <AuthPanel onAuthed={handleAuthed} /> : null}
        {view === "profile" && user && token ? <ProfilePage token={token} user={user} onGalleryChanged={() => setGalleryRefreshToken((current) => current + 1)} onOpenOrder={openOrder} onLogout={handleLogout} /> : null}
        {view === "order" && orderNumber ? <OrderPage orderNumber={orderNumber} token={token} onBackHome={showHome} /> : null}
      </main>
    </div>
  );
}
