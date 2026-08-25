import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ImageLoadingContext = createContext();

export function ImageLoadingProvider({ children }) {
  const [loadingImages, setLoadingImages] = useState(new Set());
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [componentRules, setComponentRules] = useState(new Map());

  const registerImage = useCallback((src, component = "default") => {
    // Check if image is already registered for this component to avoid duplicates
    setComponentRules((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(component)) {
        newMap.set(component, {
          images: new Set(),
          loadedCount: 0,
          maxRequired: null,
          countedImages: new Set(), // Track images that have been counted
        });
      }

      const componentData = newMap.get(component);

      // Only add if not already registered
      if (!componentData.images.has(src)) {
        componentData.images.add(src);

        // Add to loading images set
        setLoadingImages((prev) => new Set([...prev, src]));
      }

      return newMap;
    });
  }, []);

  const setComponentLoadingRule = useCallback((component, maxRequired) => {
    console.log(
      "📏 setComponentLoadingRule:",
      component,
      "maxRequired:",
      maxRequired,
    );
    setComponentRules((prev) => {
      const newMap = new Map(prev);
      if (!newMap.has(component)) {
        newMap.set(component, {
          images: new Set(),
          loadedCount: 0,
          maxRequired,
          countedImages: new Set(), // Track images that have been counted
        });
      } else {
        const componentData = newMap.get(component);
        componentData.maxRequired = maxRequired;
      }
      return newMap;
    });
  }, []);

  const markImageLoaded = useCallback((src) => {
    setLoadedImages((prev) => {
      // Only add if not already loaded to prevent duplicates
      if (!prev.has(src)) {
        return new Set([...prev, src]);
      }
      return prev; // Already loaded, don't change
    });
    
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });

    // Update component-specific counters only once per image
    setComponentRules((prev) => {
      const newMap = new Map(prev);
      for (const [component, data] of newMap.entries()) {
        if (data.images.has(src)) {
          // Only increment if not already counted
          const alreadyCounted = prev.get(component)?.countedImages?.has(src);
          if (!alreadyCounted) {
            data.loadedCount += 1;
            // Track that this image was counted for this component
            if (!data.countedImages) {
              data.countedImages = new Set();
            }
            data.countedImages.add(src);
          }
          break;
        }
      }
      return newMap;
    });
  }, []);

  const markImageError = useCallback((src) => {
    // Consider failed images as "loaded" to prevent infinite loading
    setLoadedImages((prev) => {
      // Only add if not already loaded to prevent duplicates
      if (!prev.has(src)) {
        return new Set([...prev, src]);
      }
      return prev; // Already loaded, don't change
    });
    
    setLoadingImages((prev) => {
      const newSet = new Set(prev);
      newSet.delete(src);
      return newSet;
    });

    // Update component-specific counters only once per image
    setComponentRules((prev) => {
      const newMap = new Map(prev);
      for (const [component, data] of newMap.entries()) {
        if (data.images.has(src)) {
          // Only increment if not already counted
          const alreadyCounted = prev.get(component)?.countedImages?.has(src);
          if (!alreadyCounted) {
            data.loadedCount += 1;
            // Track that this image was counted for this component
            if (!data.countedImages) {
              data.countedImages = new Set();
            }
            data.countedImages.add(src);
          }
          break;
        }
      }
      return newMap;
    });
  }, []);

  // Check if all images are loaded considering component rules
  const allImagesLoaded = useMemo(() => {
    // If no components have been registered yet, not loaded
    if (componentRules.size === 0) {
      return false;
    }

    // Check each component
    for (const [, data] of componentRules.entries()) {
      const { loadedCount, maxRequired, images } = data;

      if (maxRequired !== null) {
        // Component has a specific loading rule (like saveTheDate: 30)
        if (loadedCount < maxRequired) {
          return false;
        }
      } else {
        // Component needs ALL images loaded
        const totalImages = images.size;
        if (loadedCount < totalImages) {
          return false;
        }
      }
    }

    return true;
  }, [componentRules]);

  const value = useMemo(() => ({
    registerImage,
    setComponentLoadingRule,
    markImageLoaded,
    markImageError,
    allImagesLoaded,
    totalImages: loadedImages.size,
    loadingCount: loadingImages.size,
    componentRules,
  }), [
    registerImage,
    setComponentLoadingRule,
    markImageLoaded,
    markImageError,
    allImagesLoaded,
    loadedImages.size,
    loadingImages.size,
    componentRules,
  ]);

  return (
    <ImageLoadingContext.Provider value={value}>
      {children}
    </ImageLoadingContext.Provider>
  );
}

export function useImageLoading() {
  const context = useContext(ImageLoadingContext);
  if (!context) {
    throw new Error("useImageLoading must be used within ImageLoadingProvider");
  }
  return context;
}

// Custom hook for individual images
export function useImageLoader(src, component = "default") {
  const { registerImage, markImageLoaded, markImageError } = useImageLoading();

  const handleLoad = useCallback(() => {
    markImageLoaded(src);
  }, [src, markImageLoaded]);

  const handleError = useCallback(() => {
    markImageError(src);
  }, [src, markImageError]);

  // Register image when component mounts or src/component changes
  useEffect(() => {
    if (src) {
      registerImage(src, component);
    }
  }, [src, component, registerImage]);

  return { handleLoad, handleError };
}