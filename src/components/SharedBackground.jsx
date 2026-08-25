import { useRef } from "react";
import { useBranding } from "../context/BrandingContext";
import "./SharedBackground.css";

const SharedBackground = ({ children }) => {
  const containerRef = useRef(null);
  const branding     = useBranding();
  const venuePhoto   = branding?.venuePhotos?.[0] || null;

  const bgStyle = venuePhoto
    ? { backgroundImage: `linear-gradient(rgba(99,86,90,0.5), rgba(90,20,45,0.5)), url(${venuePhoto})` }
    : { backgroundImage: `linear-gradient(rgba(99,86,90,0.5), rgba(90,20,45,0.5)), url(/yarze.png)` };

  return (
    <div className="shared-background-container" ref={containerRef}>
      <div className="fixed-bg" style={bgStyle} />
      <div className="content">{children}</div>
    </div>
  );
};

export default SharedBackground;
