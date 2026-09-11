import { useEffect, useState } from "react";
import { Route, Routes, useLocation, Navigate } from "react-router-dom";
import Admin from "./Admin/Admin";
import Login from "./Admin/Login";
import BackgroundMusic from "./BackgroundMusic/BackgroundMusic";
import Gift from "./Gift/Gift";
import Invitation from "./Invitation/Invitation";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Location from "./Location/Location";
import WeddingCountdown from "./WeddingCountdown/WeddingCountdown";
import Guest from "./RSVP/Guest";
import SaveTheDate from "./SaveTheDate/SaveTheDate";
import SharedBackground from "./components/SharedBackground";
import HorizontalNav from "./components/HorizontalNav";
import { ClientProvider, useClient } from "./context/ClientContext";
import { BrandingProvider } from "./context/BrandingContext";
import { useBranding } from "./context/BrandingContext";
import { ImageLoadingProvider, useImageLoading } from "./hooks/useImageLoading";
import { useHorizontalSwipe } from "./hooks/useHorizontalSwipe";
import "./styles/layout.css";

// These images must be decoded before the card can open
const CRITICAL_IMAGES = ["/yarze.png", "/invitation.png", "/canva.png"];

// Injects <link rel="preload"> into <head> so the browser fetches them immediately
function PreloadCriticalImages() {
  useEffect(() => {
    CRITICAL_IMAGES.forEach((src) => {
      if (!document.querySelector(`link[rel="preload"][href="${src}"]`)) {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = src;
        document.head.appendChild(link);
      }
    });
  }, []);
  return null;
}

// Registers the critical images with the loading gate so the screen waits for them
function CriticalImageGate() {
  const { registerImage, markImageLoaded, markImageError } = useImageLoading();

  useEffect(() => {
    CRITICAL_IMAGES.forEach((src) => {
      registerImage(src, "critical");
      const img = new Image();
      img.onload = () => markImageLoaded(src);
      img.onerror = () => markImageError(src);
      img.src = src;
    });
  }, [registerImage, markImageLoaded, markImageError]);

  return null;
}

function DetailsPage({ familyId, onGuestDataLoaded }) {
  const [showGift, setShowGift] = useState(true);

  return (
    <>
      <SaveTheDate />
      <Invitation />
      <SharedBackground>
        <Location />
        <WeddingCountdown />
        <Guest
          familyId={familyId}
          onDataLoaded={onGuestDataLoaded}
          onGiftRegistryLoaded={(giftRegistry) => setShowGift(!giftRegistry)}
        />
        {showGift && <Gift />}
      </SharedBackground>
    </>
  );
}

function AppContent() {
  const location = useLocation();
  const [familyId, setFamilyId] = useState(null);
  const [shouldPlayMusic, setShouldPlayMusic] = useState(false);
  const [userTapped, setUserTapped] = useState(false);
  const [guestDataLoaded, setGuestDataLoaded] = useState(false);
  const { allImagesLoaded } = useImageLoading();
  const branding = useBranding();
  
  // Enable swipe navigation when horizontal layout is active
  const isHorizontal = branding?.layoutOrientation === "horizontal";
  useHorizontalSwipe(isHorizontal);

  useEffect(() => {
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setViewportHeight();

    window.addEventListener("resize", setViewportHeight);
    window.addEventListener("orientationchange", setViewportHeight);

    return () => {
      window.removeEventListener("resize", setViewportHeight);
      window.removeEventListener("orientationchange", setViewportHeight);
    };
  }, []);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlFamilyId = queryParams.get("familyId");

    // Check URL first, then sessionStorage, then default
    if (urlFamilyId) {
      setFamilyId(urlFamilyId);
      sessionStorage.setItem("familyId", urlFamilyId);
    } else {
      const storedFamilyId = sessionStorage.getItem("familyId");
      if (storedFamilyId) {
        setFamilyId(storedFamilyId);
      } else {
      }
    }
  }, [location.search]);

  const isAdmin   = location.pathname.startsWith("/admin");
  const isLogin   = location.pathname.startsWith("/login");
  const isPreview = new URLSearchParams(location.search).get("preview") === "true";

  const { clientId, login } = useClient();

  // Show content immediately when user tapped
  const loadingEnabled = branding?.showLoadingScreen !== false;
  const showContent = userTapped || !loadingEnabled;
  const showLoading = !userTapped && loadingEnabled;

  // Handle tap to open - immediate response
  const handleLoadingComplete = () => {
    setUserTapped(true);
    setShouldPlayMusic(true); // Start music immediately on tap
  };

  // When loading screen is disabled, start music automatically
  useEffect(() => {
    if (!loadingEnabled) setShouldPlayMusic(true);
  }, [loadingEnabled]);

  // Login page
  if (isLogin) {
    if (clientId) return <Navigate to="/admin" replace />;
    return <Login onLogin={login} />;
  }

  // Admin route — must be logged in
  if (isAdmin) {
    if (!clientId) return <Navigate to="/login" replace />;
    return (
      <Routes>
        <Route path="/admin" element={<Admin />} />
      </Routes>
    );
  }

  // Root: redirect to login if not logged in, to admin if logged in
  if (location.pathname === "/") {
    return <Navigate to={clientId ? "/admin" : "/login"} replace />;
  }

  // Preview mode: skip tap/loading screen, show content immediately
  if (isPreview) {
    return (
      <div className="root-class content-visible">
        <Routes>
          <Route path="/invitationcard" element={<DetailsPage familyId={null} onGuestDataLoaded={() => {}} />} />
        </Routes>
      </div>
    );
  }

  if (showLoading) {
    return (
      <>
        {/* Hidden components that need to load images */}
        <div
          style={{
            position: "absolute",
            top: "-9999px",
            left: "-9999px",
            opacity: 0,
            pointerEvents: "none",
          }}>
          <DetailsPage
            familyId={familyId}
            onGuestDataLoaded={setGuestDataLoaded}
          />
        </div>
        {/* Loading screen */}
        <LoadingScreen
          onComplete={handleLoadingComplete}
          allDataLoaded={allImagesLoaded && guestDataLoaded}
        />
      </>
    );
  }

  return (
    <>
      <BackgroundMusic shouldPlay={shouldPlayMusic} />
      <div className={`root-class ${showContent ? "content-visible" : ""}`}>
        <Routes>
          <Route
            path="/invitationcard"
            element={
              <DetailsPage
                familyId={familyId}
                onGuestDataLoaded={setGuestDataLoaded}
              />
            }
          />
          <Route path="/admin" element={<Admin />} />
          <Route path="/login" element={<Login onLogin={login} />} />
        </Routes>
      </div>
      <HorizontalNav />
    </>
  );
}

function App() {
  return (
    <ImageLoadingProvider>
      <ClientProvider>
        <BrandingProvider>
          <PreloadCriticalImages />
          <CriticalImageGate />
          <AppContent />
        </BrandingProvider>
      </ClientProvider>
    </ImageLoadingProvider>
  );
}

export default App;
