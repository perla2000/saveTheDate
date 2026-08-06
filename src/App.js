import { useEffect, useState } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Admin from "./Admin/Admin";
import BackgroundMusic from "./BackgroundMusic/BackgroundMusic";
import Gift from "./Gift/Gift";
import Invitation from "./Invitation/Invitation";
import LoadingScreen from "./LoadingScreen/LoadingScreen";
import Location from "./Location/Location";
import Guest from "./RSVP/Guest";
import SaveTheDate from "./SaveTheDate/SaveTheDate";
import WeddingCountdown from "./WeddingCountdown/WeddingCountdown";
import SharedBackground from "./components/SharedBackground";
import { ClientProvider } from "./context/ClientContext";
import { ImageLoadingProvider, useImageLoading } from "./hooks/useImageLoading";

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

  const isAdmin = location.pathname.startsWith("/admin");

  // On the admin route skip loading screen and music entirely
  if (isAdmin) {
    return (
      <Routes>
        <Route path="/admin" element={<Admin />} />
      </Routes>
    );
  }

  // Show content immediately when user tapped
  const showContent = userTapped;
  const showLoading = !userTapped;

  // Handle tap to open - immediate response
  const handleLoadingComplete = () => {
    setUserTapped(true);
    setShouldPlayMusic(true); // Start music immediately on tap
  };

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
            path="/"
            element={
              <DetailsPage
                familyId={familyId}
                onGuestDataLoaded={setGuestDataLoaded}
              />
            }
          />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  return (
    <ImageLoadingProvider>
      <ClientProvider>
        <PreloadCriticalImages />
        <CriticalImageGate />
        <AppContent />
      </ClientProvider>
    </ImageLoadingProvider>
  );
}

export default App;
