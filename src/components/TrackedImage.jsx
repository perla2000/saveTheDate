import { useImageLoader } from "../hooks/useImageLoading";

const TrackedImage = ({
  src,
  alt,
  className,
  onLoad,
  onError,
  component = "default",
  ...props
}) => {
  const { handleLoad: trackLoad, handleError: trackError } = useImageLoader(
    src,
    component,
  );

  const handleLoad = (e) => {
    // Track the image load in the global system
    trackLoad();

    // Call any additional onLoad handler passed as prop
    if (onLoad) {
      onLoad(e);
    }
  };

  const handleError = (e) => {
    // Track the image error in the global system
    trackError();

    // Call any additional onError handler passed as prop
    if (onError) {
      onError(e);
    }
  };

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      {...props}
    />
  );
};

export default TrackedImage;
