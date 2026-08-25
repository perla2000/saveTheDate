/**
 * Image preloading utilities for faster loading times
 */

class ImagePreloader {
  constructor() {
    this.cache = new Map();
    this.preloadedImages = new Set();
  }

  /**
   * Preload a single image
   */
  preloadImage(src, priority = 'normal') {
    if (this.preloadedImages.has(src)) {
      return Promise.resolve(this.cache.get(src));
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set priority hints for modern browsers
      if (priority === 'high' && 'importance' in img) {
        img.importance = 'high';
      }
      
      img.onload = () => {
        console.log("⚡ Preloaded image:", src);
        this.preloadedImages.add(src);
        this.cache.set(src, img);
        resolve(img);
      };
      
      img.onerror = (error) => {
        console.error("❌ Preload failed:", src, error);
        reject(error);
      };
      
      // Start loading
      img.src = src;
    });
  }

  /**
   * Preload multiple images with priority
   */
  async preloadImages(images, options = {}) {
    const { 
      priority = 'normal', 
      maxConcurrent = 6,
      onProgress = null 
    } = options;

    console.log(`🚀 Preloading ${images.length} images with ${maxConcurrent} concurrent loads`);
    
    let loaded = 0;
    const results = [];
    
    const loadWithProgress = async (src) => {
      try {
        const result = await this.preloadImage(src, priority);
        loaded++;
        
        if (onProgress) {
          onProgress(loaded, images.length, src);
        }
        
        return { src, success: true, image: result };
      } catch (error) {
        loaded++;
        
        if (onProgress) {
          onProgress(loaded, images.length, src);
        }
        
        return { src, success: false, error };
      }
    };
    
    // Process images in batches to avoid overwhelming the browser
    for (let i = 0; i < images.length; i += maxConcurrent) {
      const batch = images.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(src => loadWithProgress(src));
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(r => r.value || r.reason));
    }
    
    const successful = results.filter(r => r.success).length;
    console.log(`✅ Preloading complete: ${successful}/${images.length} images loaded`);
    
    return results;
  }

  /**
   * Preload critical images immediately (above-the-fold content)
   */
  preloadCriticalImages(images) {
    console.log("🔥 Preloading critical images:", images.length);
    return this.preloadImages(images, { 
      priority: 'high',
      maxConcurrent: 8 // More concurrent for critical images
    });
  }

  /**
   * Preload images in the background with lower priority
   */
  preloadInBackground(images, onProgress = null) {
    // Use requestIdleCallback if available for background loading
    const loadWhenIdle = () => {
      return this.preloadImages(images, { 
        priority: 'low',
        maxConcurrent: 3, // Fewer concurrent for background
        onProgress 
      });
    };

    if (window.requestIdleCallback) {
      return new Promise((resolve) => {
        window.requestIdleCallback(() => {
          loadWhenIdle().then(resolve);
        });
      });
    } else {
      // Fallback: use setTimeout for older browsers
      return new Promise((resolve) => {
        setTimeout(() => {
          loadWhenIdle().then(resolve);
        }, 100);
      });
    }
  }

  /**
   * Check if an image is already preloaded
   */
  isPreloaded(src) {
    return this.preloadedImages.has(src);
  }

  /**
   * Get preloaded image from cache
   */
  getCachedImage(src) {
    return this.cache.get(src);
  }

  /**
   * Clear the preload cache
   */
  clearCache() {
    this.cache.clear();
    this.preloadedImages.clear();
  }
}

// Create a singleton instance
const imagePreloader = new ImagePreloader();

/**
 * React hook for image preloading
 */
export const useImagePreloader = () => {
  const preloadCritical = (images) => {
    return imagePreloader.preloadCriticalImages(images);
  };

  const preloadBackground = (images, onProgress) => {
    return imagePreloader.preloadInBackground(images, onProgress);
  };

  const isPreloaded = (src) => {
    return imagePreloader.isPreloaded(src);
  };

  return {
    preloadCritical,
    preloadBackground,
    isPreloaded,
    preloader: imagePreloader
  };
};

export default imagePreloader;
