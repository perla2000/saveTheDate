import { useCallback, useEffect, useRef, useState } from "react";
import { useImageLoader } from "../hooks/useImageLoading";
import imagePreloader from "../utils/imagePreloader";

const LazyImage = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  component = "default",
  placeholder = "/placeholder.jpg",
  threshold = 0.1,
  rootMargin = "200px",
  eager = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(eager);
  const [imageSrc, setImageSrc] = useState(eager ? src : placeholder);
  const [isFromCache, setIsFromCache] = useState(false);
  const imgRef = useRef();
  const { handleLoad: trackLoad, handleError: trackError } = useImageLoader(
    src,
    component,
  );

  // Intersection Observer for lazy loading
  const observerRef = useRef();

  // Check if image is already cached
  useEffect(() => {
    if (eager || !src) return;

    // Check if image is already preloaded/cached
    const cachedImage = imagePreloader.getCachedImage(src);
    const isPreloaded = imagePreloader.isPreloaded(src);

    if (isPreloaded || cachedImage) {
      console.log("🎯 Using cached image:", src);
      setImageSrc(src);
      setIsFromCache(true);
      setIsLoaded(true);
      setIsInView(true);
      // Still track the load for the global system
      trackLoad();
      return;
    }
  }, [src, eager, trackLoad]);

  useEffect(() => {
    if (eager || !imgRef.current || isFromCache) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isInView) {
          console.log("🔍 Image in view, checking cache first:", src);

          // Double-check cache before loading
          const cachedImage = imagePreloader.getCachedImage(src);
          if (cachedImage) {
            console.log("🎯 Found in cache during intersection:", src);
            setImageSrc(src);
            setIsFromCache(true);
            setIsLoaded(true);
            setIsInView(true);
            trackLoad();
          } else {
            console.log("📥 Loading new image:", src);
            setIsInView(true);
            setImageSrc(src);
          }

          observerRef.current?.unobserve(imgRef.current);
        }
      },
      {
        threshold,
        rootMargin, // This loads images before they enter the viewport
      },
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current && imgRef.current) {
        observerRef.current.unobserve(imgRef.current);
      }
    };
  }, [src, eager, isInView, threshold, rootMargin, isFromCache, trackLoad]);

  const handleLoad = useCallback(
    (e) => {
      if (isFromCache) {
        // Image was from cache, just call onLoad handler
        if (onLoad) {
          onLoad(e);
        }
        return;
      }

      console.log(
        "🖼️ Lazy image loaded and cached:",
        src,
        "component:",
        component,
      );
      setIsLoaded(true);

      // Add to cache for future use
      imagePreloader.preloadImage(src).then(() => {
        console.log("💾 Image cached for reuse:", src);
      });

      // Track the image load in the global system
      trackLoad();

      // Call any additional onLoad handler passed as prop
      if (onLoad) {
        onLoad(e);
      }
    },
    [src, component, trackLoad, onLoad, isFromCache],
  );

  const handleError = useCallback(
    (e) => {
      console.log(
        "❌ Lazy image error:",
        src,
        "component:",
        component,
        "error:",
        e,
      );

      // Track the image error in the global system
      trackError();

      // Call any additional onError handler passed as prop
      if (onError) {
        onError(e);
      }
    },
    [src, component, trackError, onError],
  );

  // Preload critical images
  useEffect(() => {
    if (eager && src) {
      const img = new Image();
      img.onload = () => setIsLoaded(true);
      img.src = src;
    }
  }, [eager, src]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`${className} ${isLoaded ? "loaded" : "loading"} ${isFromCache ? "cached" : ""}`}
      onLoad={handleLoad}
      onError={handleError}
      loading={eager ? "eager" : "lazy"} // Native lazy loading as fallback
      decoding="async" // Non-blocking image decoding
      {...props}
    />
  );
};

export default LazyImage;
