import { useEffect, useMemo, useRef, useState } from "react";
import LazyImage from "../components/LazyImage";
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

  const handleSwipeClick = () => {
    setIsSwipeClicked(true);

    const nextSection = document.querySelector(".next-section");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
    }

    setTimeout(() => setIsSwipeClicked(false), 600);
  };

  function importAll(r) {
    return r.keys().map(r);
  }

  const photos = useMemo(() => {
    try {
      const photoContext = require.context(
        "../../public/photos",
        false,
        /\.(png|jpe?g)$/,
      );
      return importAll(photoContext);
    } catch (error) {
      console.error("Error loading photos:", error);
      return ["/photos/photo1.jpeg"];
    }
  }, []);

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
  }, [photos.length]); // important: rerun if photos list changes

  return (
    <div className="std-page full-screen-section">
      <div className="std-bg" ref={scrollRef}>
        <div className="std-grid" ref={contentRef}>
          {/* Show loading spinner while critical images load */}
          {!allLoaded && (
            <div className="loading-overlay">
              <div className="loading-spinner">Loading...</div>
            </div>
          )}

          {/* Render photos twice for seamless circular effect */}
          {[...photos, ...photos].map((src, i) => (
            <LazyImage
              key={i}
              className="std-img std-photo progressive-image optimized-image"
              src={src}
              alt=""
              eager={i < 20} // Only first 12 images eager (reduced from 35)
              threshold={0.1} // Increased threshold - load later (was 0.1)
              rootMargin="50px" // Reduced margin - load closer to viewport (was 300px)
              component="saveTheDate"
              loading={i < 20 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={i < 6 ? "high" : "low"} // High priority for first 6 images
              onLoad={() => setLoadedCount((c) => c + 1)}
              onError={() => setLoadedCount((c) => c + 1)}
            />
          ))}
        </div>
      </div>

      <div className="std-overlay">
        <div className="std-center">
          <div className="std-title">A DECADE OF LOVE,</div>
          <div className="std-names">Justin &amp; Yara</div>
          <div className="std-title">A LIFETIME TO GO!</div>

          {/* <div className="std-logo">
            <LazyImage
              className="std-logo-img critical-image"
              src="/whitelogo.png"
              alt="logo"
              component="saveTheDate"
              eager={true}
            />
          </div> */}
        </div>

        <div className="swipe-down-indicator">
          <div className="scroll-text">Scroll Down</div>
          <div
            className={`swipe-arrow ${isSwipeClicked ? "swipe-clicked" : ""}`}
            onClick={handleSwipeClick}
            title="Swipe down to continue">
            <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 13l5 5 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
