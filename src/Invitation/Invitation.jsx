import { useMemo, useState } from "react";
import BackgroundImageLoader from "../components/BackgroundImageLoader";
import TrackedImage from "../components/TrackedImage";
import "./Invitation.css";

export default function Invitation() {
  const [flipped, setFlipped] = useState(false);

  // Memoize the images array to prevent re-renders
  const backgroundImages = useMemo(() => ["/invitation.png", "/canva.png"], []);

  const handleCardClick = () => {
    setFlipped(!flipped);
  };

  // Dynamic inline style for the background image
  const saveTheDateStyle = {
    backgroundImage: `linear-gradient(rgba(90, 20, 45, 0.5), rgba(90, 20, 45, 0.5)), url(/canva.png)`,
  };

  return (
    <div className="invMain full-screen-section">
      <BackgroundImageLoader images={backgroundImages} component="invitation" />
      {/* <div className="invEyebrow">WITH JOYOUS HEARTS</div> */}
      <section className="invPage" aria-label="Invitation">
        <div
          className={`invCard ${flipped ? "flipped" : ""}`}
          onClick={handleCardClick}>
          {/* Front Side - Photos */}
          <div className="invSide invFront">
            <div className="invHeader">
              {/* <div className="invEyebrow">WITH JOYOUS HEARTS</div> */}
              <div className="std-logo">
                <TrackedImage
                  className="std-logo-img"
                  src="/whitelogo.png"
                  alt="logo"
                  component="invitation"
                />
              </div>
              <div className="mini-flip-text">Tap to Flip</div>
            </div>
          </div>

          <div className="invSide invBack">
            <div className="saveTheDateWrapper" style={saveTheDateStyle}>
              <div className="formal-invitation">
                <div className="invitation-top">
                  <div className="joyous-hearts">WITH JOYOUS HEARTS</div>
                </div>

                <div className="invitation-parents">
                  <div className="parent-section">
                    <div className="parent-line">
                      <span className="parent-name">General Walid</span>
                    </div>
                    <span className="parent-name">&</span>
                    <div className="parent-name">Georgina Jeitany</div>
                  </div>

                  <div className="parent-section">
                    <div className="parent-line">
                      <span className="parent-name">Admiral Assaad</span>
                    </div>
                    <span className="parent-name">&</span>
                    <div className="parent-name">Daad Abdallah</div>
                  </div>
                </div>

                <div className="invitation-text">
                  HAVE THE PLEASURE TO INVITE YOU TO THE
                  <br />
                  WEDDING CEREMONY OF THEIR BELOVED
                  <br />
                  SON & DAUGHTER
                </div>

                <div className="couple-names">Justin & Yara</div>

                <div className="wedding-details">
                  <div className="wedding-day">SATURDAY</div>
                  <div className="wedding-date">25 | JULY | 2026</div>
                  <div className="wedding-time">AT 7:00 PM</div>
                  <div className="wedding-venue">YARZEH OFFICERS CLUB</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
