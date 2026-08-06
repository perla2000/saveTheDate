import { useMemo } from "react";
import BackgroundImageLoader from "../components/BackgroundImageLoader";
import "./Location.css";

const Location = () => {
  // Memoize the images array to prevent re-renders
  const backgroundImages = useMemo(() => ["../../public/yarze.png"], []);

  const venueDetails = {
    address: "Officers Club Yarze",
  };

  const handleGetDirections = () => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(venueDetails.address)}`;
    window.open(googleMapsUrl, "_blank");
  };

  return (
    <div className="location-container">
      <BackgroundImageLoader images={backgroundImages} component="location" />
      <div className="location-header">
        <h1 className="location-title">Wedding Location</h1>
        <p className="location-subtitle">Join us at our beautiful venue</p>
      </div>

      <div className="location-content">
        <div className="location-details">
          <div className="venue-info"></div>
          <div className="map-container">
            <div className="map-wrapper">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d26061.10405075751!2d33.23597854371439!3d35.07057250264388!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f22!3m3!1m2!1s0x151f17f5032467cb%3A0x326c9386a712963a!2sYarzeh%20officers%20club!5e0!3m2!1sen!2s!4v1771197779659!5m2!1sen!2s"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Wedding Venue Location"></iframe>
            </div>

            <div className="map-overlay">
              <p>Click map to interact</p>
            </div>
          </div>

          <div>
            <button
              className="location-button clickable-direction"
              onClick={handleGetDirections}>
              Get Directions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Location;
