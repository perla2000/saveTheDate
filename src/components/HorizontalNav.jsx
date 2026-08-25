import { useEffect, useState } from "react";
import { useBranding } from "../context/BrandingContext";
import "./HorizontalNav.css";

export default function HorizontalNav() {
  const branding = useBranding();
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    if (branding?.layoutOrientation !== "horizontal") return;

    const updatePageInfo = () => {
      const sections = document.querySelectorAll('.full-screen-section');
      setTotalPages(sections.length);
      
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      const viewportWidth = window.innerWidth;
      const currentIndex = Math.round(scrollLeft / viewportWidth);
      setCurrentPage(currentIndex);
    };

    updatePageInfo();
    window.addEventListener('scroll', updatePageInfo);
    window.addEventListener('resize', updatePageInfo);

    return () => {
      window.removeEventListener('scroll', updatePageInfo);
      window.removeEventListener('resize', updatePageInfo);
    };
  }, [branding?.layoutOrientation]);

  const scrollToPage = (index) => {
    const viewportWidth = window.innerWidth;
    window.scrollTo({
      left: index * viewportWidth,
      behavior: 'smooth'
    });
  };

  if (branding?.layoutOrientation !== "horizontal" || totalPages === 0) {
    return null;
  }

  return (
    <div className="horizontal-nav">
      <div className="horizontal-nav-hint">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span>Swipe</span>
      </div>
    </div>
  );
}
