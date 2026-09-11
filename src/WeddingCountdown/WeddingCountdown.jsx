import { useEffect, useState } from "react";
import { useClient } from "../context/ClientContext";
import { useBranding } from "../context/BrandingContext";
import "./WeddingCountdown.css";

const WeddingCountdown = () => {
  const { clientConfig } = useClient();
  const branding = useBranding();
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer effect
  useEffect(() => {
    const weddingDateStr = branding?.weddingDate || clientConfig?.weddingDate || "2026-07-25";
    const weddingTimeStr = branding?.weddingTime || clientConfig?.weddingTime || "19:00";
    const weddingDate = new Date(`${weddingDateStr}T${weddingTimeStr}:00`).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = weddingDate - now;

      if (distance > 0) {
        setCountdown({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor(
            (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
          ),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [clientConfig, branding]);

  const addToGoogleCalendar = () => {
    const weddingDateStr = branding?.weddingDate || clientConfig?.weddingDate || "2026-07-25";
    const weddingTimeStr = branding?.weddingTime || clientConfig?.weddingTime || "19:00";
    const formattedDate = weddingDateStr.replace(/-/g, "");
    const formattedTime = weddingTimeStr.replace(/:/g, "") + "00";
    
    const eventDetails = {
      title: `${branding?.coupleName || clientConfig?.coupleName || "The Couple"}'s Wedding`,
      date: formattedDate,
      startTime: formattedTime,
      endTime: "240000",
      location: branding?.venue || clientConfig?.venue || "Yarze Officers Club",
      description: `Join us in celebrating the wedding of ${branding?.coupleName || clientConfig?.coupleName || "the happy couple"}!`,
    };

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      eventDetails.title,
    )}&dates=${eventDetails.date}T${eventDetails.startTime}/${eventDetails.date}T${
      eventDetails.endTime
    }&details=${encodeURIComponent(eventDetails.description)}&location=${encodeURIComponent(
      eventDetails.location,
    )}`;

    window.open(googleCalendarUrl, "_blank");
  };

  return (
    <div className="countdown-container">
      <div className="countdown-header">
        <h1 className="countdown-title">Save the Date</h1>
        <p className="countdown-subtitle">
          Mark your calendars for our special day
        </p>
      </div>

      <div className="countdown-content">
        {/* Wedding Date and Countdown Card */}
        <div className="wedding-date-card">
          <div className="date-section">
            <div
              className="wedding-date clickable-date"
              onClick={addToGoogleCalendar}
              title="Add to Google Calendar">
              <div className="date-number">
                {(branding?.weddingDate || clientConfig?.weddingDate)
                  ? new Date(branding?.weddingDate || clientConfig?.weddingDate).toLocaleDateString("en-GB", { 
                      day: "2-digit", 
                      month: "2-digit", 
                      year: "2-digit" 
                    }).replace(/\//g, ".")
                  : "25.07.26"}
              </div>
              <div className="date-save">Tap to save to calendar</div>
            </div>
          </div>

          <div className="countdown-section">
            <h3 className="countdown-card-title">Countdown to Our Big Day</h3>
            <div className="countdown-display">
              <div className="countdown-item">
                <span className="countdown-number">{countdown.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{countdown.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{countdown.minutes}</span>
                <span className="countdown-label">Minutes</span>
              </div>
              <div className="countdown-item">
                <span className="countdown-number">{countdown.seconds}</span>
                <span className="countdown-label">Seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeddingCountdown;
