import { useEffect, useRef, useState } from "react";

export default function BackgroundMusic({ shouldPlay }) {
  const audioRef = useRef(null);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isUserInteracted, setIsUserInteracted] = useState(false);

  // Handle visibility change (tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set volume (0.0 to 1.0)
    audio.volume = 0.4; // 40% volume

    // Control playback based on shouldPlay, visibility, and user interaction
    const shouldActuallyPlay =
      shouldPlay && isDocumentVisible && isUserInteracted;

    if (shouldActuallyPlay) {
      audio.muted = false;
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [shouldPlay, isDocumentVisible, isUserInteracted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Start muted for autoplay compliance
    audio.muted = true;
    audio.play().catch(() => {});

    // Enable sound on first interaction
    const enableSound = () => {
      setIsUserInteracted(true);
      audio.muted = false;
      if (shouldPlay && isDocumentVisible) {
        audio.play().catch(() => {});
      }
      document.removeEventListener("click", enableSound);
      document.removeEventListener("touchstart", enableSound);
    };

    document.addEventListener("click", enableSound);
    document.addEventListener("touchstart", enableSound);

    return () => {
      document.removeEventListener("click", enableSound);
      document.removeEventListener("touchstart", enableSound);
    };
  }, [shouldPlay, isDocumentVisible]);

  return (
    <audio ref={audioRef} loop autoPlay playsInline>
      <source src="/music.mp3" type="audio/mpeg" />
    </audio>
  );
}
