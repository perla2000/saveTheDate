import { useImageLoading } from "../hooks/useImageLoading";
import "./LoadingScreen.css";

export default function LoadingScreen({ onComplete, allDataLoaded }) {
  const { allImagesLoaded, componentRules, totalImages, loadingCount } =
    useImageLoading();

  // Use the passed allDataLoaded prop if provided, otherwise fall back to allImagesLoaded
  const isAllDataLoaded =
    allDataLoaded !== undefined ? allDataLoaded : allImagesLoaded;

  // Debug logging
  console.log("🔍 LoadingScreen Debug:", {
    allImagesLoaded,
    allDataLoaded,
    isAllDataLoaded,
    totalImages,
    loadingCount,
    componentRules: Array.from(componentRules.entries()).map(
      ([name, data]) => ({
        component: name,
        loadedCount: data.loadedCount,
        maxRequired: data.maxRequired,
        totalImages: data.images.size,
        isComplete:
          data.maxRequired !== null
            ? data.loadedCount >= data.maxRequired
            : data.loadedCount >= data.images.size,
      }),
    ),
  });

  const handleTap = () => {
    if (isAllDataLoaded && onComplete) {
      onComplete();
    }
  };

  return (
    <div
      className="load-page full-screen-section"
      onClick={handleTap}
      role="status"
      aria-live="polite">
      <div className="heart-wrap" aria-hidden="true">
        <svg
          className="heart-svg"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg">
          <path
            className="heart-path"
            d="M50 78
     C 8 55, 2 28, 20 18
     C 34 10, 45 22, 50 30
     C 55 22, 66 10, 80 18
     C 98 28, 92 55, 50 78"
            fill="none"
            stroke="#8e4b62"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            className="heart-text">
            A&P
          </text>
        </svg>

        {isAllDataLoaded && (
          <div
            className="tap-to-open-below-heart"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleTap()}>
            <div className="tap-text">Tap to Open</div>
          </div>
        )}
        {!isAllDataLoaded && (
          <div className="loading-text tap-to-open-below-heart">Loading...</div>
        )}
      </div>
    </div>
  );
}
