import { useEffect, useRef } from "react";
import { useImageLoading } from "../hooks/useImageLoading";

const BackgroundImageLoader = ({ images, component }) => {
  const { registerImage, markImageLoaded, markImageError } = useImageLoading();
  const loadedImagesRef = useRef(new Set()); // Track already loaded images

  useEffect(() => {
    images.forEach((src) => {
      // Only process if not already loaded
      if (!loadedImagesRef.current.has(src)) {
        // Register the image
        registerImage(src, component);

        // Create a hidden image to load the background image
        const img = new Image();

        img.onload = () => {
          // Only mark as loaded once
          if (!loadedImagesRef.current.has(src)) {
            loadedImagesRef.current.add(src);
            markImageLoaded(src);
          }
        };

        img.onerror = () => {
          // Only mark as error once
          if (!loadedImagesRef.current.has(src)) {
            loadedImagesRef.current.add(src);
            markImageError(src);
          }
        };

        img.src = src;
      }
    });
  }, [images, component, registerImage, markImageLoaded, markImageError]);

  return null; // This component doesn't render anything
};

export default BackgroundImageLoader;
