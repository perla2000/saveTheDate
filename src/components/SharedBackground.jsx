import { useRef } from "react";
import "./SharedBackground.css";

const SharedBackground = ({ children }) => {
  const containerRef = useRef(null);

  return (
    <div className="shared-background-container" ref={containerRef}>
      <div className="fixed-bg" />
      <div className="content">{children}</div>
    </div>
  );
};

export default SharedBackground;
