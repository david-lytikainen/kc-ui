type NavigationProps = {
  isAuthenticated: boolean;
  onGalleryClick: () => void;
  onCommissionClick: () => void;
  onHomeClick: () => void;
  onProfileClick: () => void;
};


export default function Navigation({ isAuthenticated, onGalleryClick, onCommissionClick, onHomeClick, onProfileClick }: NavigationProps) {
  return (
    <header className="site-navbar sticky-top">
      <div className="container-fluid px-3 px-md-4 py-3 d-flex align-items-center justify-content-between gap-3">
        <button className="navbar-brand btn btn-link p-0 text-light text-decoration-none" onClick={onHomeClick}>Kyra&apos;s Creations</button>
        <nav className="d-flex flex-wrap justify-content-end gap-3">
          <button className="btn btn-link p-0 text-light text-decoration-none fw-semibold" onClick={onGalleryClick}>Gallery</button>
          <button className="btn btn-link p-0 text-light text-decoration-none fw-semibold" onClick={onCommissionClick}>Commission</button>
          {isAuthenticated ? <button className="btn btn-link p-0 text-light text-decoration-none fw-semibold" onClick={onProfileClick}>Profile</button> : null}
        </nav>
      </div>
    </header>
  );
}
