import { useEffect, useMemo, useRef, useState } from "react";
import LazyImage from "../components/LazyImage";
import { useBranding } from "../context/BrandingContext";
import { useClient } from "../context/ClientContext";
import { useImageLoading } from "../hooks/useImageLoading";
import "../styles/imageLoading.css";
import { useImagePreloader } from "../utils/imagePreloader";
import "./SaveTheDate.css";

export default function SaveTheDate() {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [isSwipeClicked, setIsSwipeClicked] = useState(false);
  const { setComponentLoadingRule } = useImageLoading();
  const { preloadCritical } = useImagePreloader();
  const branding = useBranding();
  const { clientConfig } = useClient();
  
  // Auto-scroll setting from branding
  const autoScrollEnabled = branding?.autoScrollEnabled !== false;

  const handleSwipeClick = () => {
    setIsSwipeClicked(true);
    
    if (branding?.layoutOrientation === "horizontal") {
      // Horizontal: scroll to next page (right)
      const viewportWidth = window.innerWidth;
      const currentScrollLeft = window.scrollX || document.documentElement.scrollLeft;
      const nextPageLeft = Math.ceil(currentScrollLeft / viewportWidth) * viewportWidth + viewportWidth;
      window.scrollTo({ left: nextPageLeft, behavior: "smooth" });
    } else {
      // Vertical: scroll down to next section
      const nextSection = document.querySelector(".next-section");
      if (nextSection) {
        nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      }
    }
    
    setTimeout(() => setIsSwipeClicked(false), 600);
  };

  // Use flip photos from branding if uploaded, else fall back to local /photos/
  const brandingFlipPhotos = branding?.flipPhotos || [];
  const hasBrandingPhotos  = brandingFlipPhotos.length > 0;

  const localPhotos = useMemo(() => {
    if (hasBrandingPhotos) return [];
    try {
      const ctx = require.context("../../public/photos", false, /\.(png|jpe?g)$/);
      return ctx.keys().map(ctx);
    } catch {
      return [];
    }
  }, [hasBrandingPhotos]);

  const photos = hasBrandingPhotos ? brandingFlipPhotos : localPhotos;

  // No need to double - we'll use math for circular scrolling
  // const doubled = useMemo(() => [...photos, ...photos], [photos]);

  useEffect(() => {
    // Preload first 30 photos immediately
    const criticalPhotos = photos.slice(0, 12);
    const criticalImages = ["/whitelogo.png", ...criticalPhotos];

    preloadCritical(criticalImages).catch(() => {});
  }, [photos, preloadCritical]);

  // Start animation once enough photos are ready
  const allLoaded = loadedCount > 8;

  useEffect(() => {
    setComponentLoadingRule("saveTheDate", 9); // Reduced from 36 to 9
    setComponentLoadingRule("invitation", 1);
    setComponentLoadingRule("gift", 2);
    setComponentLoadingRule("location", 1);
  }, [setComponentLoadingRule]);

  useEffect(() => {
    // Skip auto-scroll animation if disabled
    if (!autoScrollEnabled) return;
    
    const container = scrollRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    let rafId = 0;
    let last = performance.now();
    let pos = 0;

    const speedPxPerSec = 60;

    // Use offsetHeight because we are transforming, not scrolling content.
    const getHalfHeight = () => Math.floor(content.offsetHeight / 2);
    let halfHeight = 0;

    const recalc = () => {
      halfHeight = getHalfHeight();
    };

    // Observe height changes (images loading, orientation changes, etc.)
    const ro = new ResizeObserver(() => recalc());
    ro.observe(content);

    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;

      // If height isn't ready yet, keep waiting (no movement yet)
      if (halfHeight <= 0) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      pos += speedPxPerSec * dt;
      if (pos >= halfHeight) pos = 0;

      content.style.transform = `translate3d(0, -${pos}px, 0)`;

      rafId = requestAnimationFrame(tick);
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        last = performance.now();
        rafId = requestAnimationFrame(tick);
      }
    };

    // Optional: pause on touch for better UX
    const pause = () => cancelAnimationFrame(rafId);
    const resume = () => {
      last = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    document.addEventListener("visibilitychange", onVisibility);
    container.addEventListener("touchstart", pause, { passive: true });
    container.addEventListener("touchend", resume, { passive: true });

    // initial measure + start
    recalc();
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();

      document.removeEventListener("visibilitychange", onVisibility);
      container.removeEventListener("touchstart", pause);
      container.removeEventListener("touchend", resume);

      content.style.transform = "";
      content.style.webkitTransform = "";
    };
  }, [photos.length, autoScrollEnabled]); // important: rerun if photos list changes or autoScroll changes

  return (
    <div className="std-page full-screen-section" style={photos.length === 0 ? { background: "#111" } : {}}>
      <div className="std-bg" ref={scrollRef}>
        {autoScrollEnabled ? (
          // Scrolling grid mode
          <div className="std-grid" ref={contentRef}>
            {photos.length === 0 && (
              <div style={{ width: "100%", height: "100vh", background: "#111" }} />
            )}
            {/* Render photos twice for seamless circular effect */}
            {[...photos, ...photos].map((src, i) => (
              <LazyImage
                key={i}
                className="std-img std-photo progressive-image optimized-image"
                src={src}
                alt=""
                eager={i < 20}
                threshold={0.1}
                rootMargin="50px"
                component="saveTheDate"
                loading={i < 20 ? "eager" : "lazy"}
                decoding="async"
                fetchPriority={i < 6 ? "high" : "low"}
                onLoad={() => setLoadedCount((c) => c + 1)}
                onError={() => setLoadedCount((c) => c + 1)}
              />
            ))}
          </div>
        ) : (
          // Single image mode
          <div className="std-single-photo" ref={contentRef}>
            {photos.length > 0 ? (
              <img
                className="std-featured-img"
                src={photos[0]}
                alt="Featured"
                onLoad={() => setLoadedCount((c) => c + 1)}
                onError={() => setLoadedCount((c) => c + 1)}
              />
            ) : (
              <div style={{ width: "100%", height: "100vh", background: "#111" }} />
            )}
          </div>
        )}
      </div>

      <div className="std-overlay">
        <div className="std-center">
          <div className="std-title">{branding?.saveTheDateSubtitle || clientConfig?.saveTheDateSubtitle || "A DECADE OF LOVE,"}</div>
          <div className="std-names">{branding?.coupleName || clientConfig?.coupleName || "The Couple"}</div>
          <div className="std-title">{branding?.saveTheDateTitle || clientConfig?.saveTheDateTitle || "A LIFETIME TO GO!"}</div>

          {branding?.logo && (
            <div className="std-logo">
              <img
                className="std-logo-img critical-image"
                src={branding.logo}
                alt="Wedding Logo"
              />
            </div>
          )}
        </div>

        <div className="swipe-down-indicator">
          <div className="scroll-text">
            {branding?.layoutOrientation === "horizontal" ? "Swipe" : "Scroll Down"}
          </div>
          <div
            className={`swipe-arrow ${isSwipeClicked ? "swipe-clicked" : ""}`}
            onClick={handleSwipeClick}
            title="Scroll down to continue">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
              {branding?.layoutOrientation === "horizontal" ? (
                // Right arrow for horizontal/swipe
                <path
                  d="M9 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                // Down arrow for vertical/scroll
                <path
                  d="M7 13l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
