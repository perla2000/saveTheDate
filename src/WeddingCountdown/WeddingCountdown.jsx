import { useEffect, useState } from "react";
import "./WeddingCountdown.css";

const WeddingCountdown = () => {
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Countdown timer effect
  useEffect(() => {
    const weddingDate = new Date("2026-07-25T19:00:00").getTime();

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
  }, []);

  const addToGoogleCalendar = () => {
    const eventDetails = {
      title: "Justin & Yara's Wedding",
      date: "20260725",
      startTime: "190000",
      endTime: "240000",
      location: "Yarze Officers Club",
      description: "Join us in celebrating the wedding of Justin and Yara!",
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
              <div className="date-number">25.07.26</div>
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
