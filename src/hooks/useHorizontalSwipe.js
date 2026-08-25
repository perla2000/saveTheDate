import { useEffect, useRef, useCallback } from "react";

/**
 * Hook to enable swipe navigation in horizontal layout mode
 * Detects touch swipes and arrow key presses to navigate between pages
 */
export const useHorizontalSwipe = (enabled) => {
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isScrolling = useRef(false);

  const scrollToSection = useCallback((direction) => {
    if (isScrolling.current) return;
    
    const sections = document.querySelectorAll('.full-screen-section');
    if (!sections.length) return;

    // Find current section based on scroll position
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    const viewportWidth = window.innerWidth;
    const currentIndex = Math.round(scrollLeft / viewportWidth);
    
    let targetIndex = currentIndex;
    if (direction === 'next' && currentIndex < sections.length - 1) {
      targetIndex = currentIndex + 1;
    } else if (direction === 'prev' && currentIndex > 0) {
      targetIndex = currentIndex - 1;
    }

    if (targetIndex !== currentIndex) {
      isScrolling.current = true;
      window.scrollTo({
        left: targetIndex * viewportWidth,
        behavior: 'smooth'
      });
      
      // Reset scrolling flag after animation
      setTimeout(() => {
        isScrolling.current = false;
      }, 600);
    }
  }, []);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const swipeThreshold = 50; // minimum swipe distance in pixels
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      // Mark that user has interacted
      document.body.classList.add('user-interacted');
      
      if (diff > 0) {
        // Swiped left - go to next page
        scrollToSection('next');
      } else {
        // Swiped right - go to previous page
        scrollToSection('prev');
      }
    }
  }, [scrollToSection]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      document.body.classList.add('user-interacted');
      scrollToSection('prev');
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      document.body.classList.add('user-interacted');
      scrollToSection('next');
    }
  }, [scrollToSection]);

  const handleWheel = useCallback((e) => {
    // Convert vertical scroll to horizontal navigation
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      document.body.classList.add('user-interacted');
      if (e.deltaY > 0) {
        scrollToSection('next');
      } else {
        scrollToSection('prev');
      }
    }
  }, [scrollToSection]);

  useEffect(() => {
    if (!enabled) return;

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);
    
    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyDown);
    
    // Add wheel event for vertical scroll -> horizontal navigation
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleKeyDown, handleWheel]);
};
