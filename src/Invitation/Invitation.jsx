import { useMemo, useState } from "react";
import BackgroundImageLoader from "../components/BackgroundImageLoader";
import TrackedImage from "../components/TrackedImage";
import { useBranding } from "../context/BrandingContext";
import { useClient } from "../context/ClientContext";
import "./Invitation.css";

export default function Invitation() {
  const [flipped, setFlipped]   = useState(false);
  const branding                = useBranding();
  const { clientConfig }        = useClient();

  const couplePhoto = branding?.couplePhotos?.[0] || null;
  const venuePhoto  = branding?.venuePhotos?.[0]  || null;

  // Only preload static assets — branding images are already in memory (base64)
  const backgroundImages = useMemo(() => {
    const imgs = [];
    if (!couplePhoto) imgs.push("/invitation.png");
    if (!venuePhoto)  imgs.push("/canva.png");
    return imgs;
  }, [couplePhoto, venuePhoto]);

  const mainBgStyle = venuePhoto
    ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${venuePhoto})` }
    : couplePhoto
      ? { backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${couplePhoto})` }
      : { background: "#111" };

  const frontStyle = couplePhoto
    ? { backgroundImage: `url(${couplePhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: "url(/invitation.png)", backgroundSize: "cover", backgroundPosition: "center" };

  const backBgStyle = venuePhoto
    ? { backgroundImage: `linear-gradient(rgba(90,20,45,0.5), rgba(90,20,45,0.5)), url(${venuePhoto})` }
    : { backgroundImage: `linear-gradient(rgba(90,20,45,0.5), rgba(90,20,45,0.5)), url(/canva.png)` };

  return (
    <div className="invMain full-screen-section" style={mainBgStyle}>
      {backgroundImages.length > 0 && (
        <BackgroundImageLoader images={backgroundImages} component="invitation" />
      )}
      <section className="invPage" aria-label="Invitation">
        <div
          className={`invCard ${flipped ? "flipped" : ""}`}
          onClick={() => setFlipped((f) => !f)}>

          {/* Front Side */}
          <div className="invSide invFront" style={frontStyle}>
            <div className="invHeader">
              {branding?.logo && (
                <div className="std-logo">
                  <img
                    className="std-logo-img"
                    src={branding.logo}
                    alt="Wedding Logo"
                  />
                </div>
              )}
              <div className="mini-flip-text">Tap to Flip</div>
            </div>
          </div>

          {/* Back Side */}
          <div className="invSide invBack">
            <div className="saveTheDateWrapper" style={backBgStyle}>
              <div className="formal-invitation">
                <div className="invitation-top">
                  <div className="joyous-hearts">WITH JOYOUS HEARTS</div>
                </div>

                <div className="invitation-parents">
                  <div className="parent-section">
                    <div className="parent-name">{branding?.groomParents || clientConfig?.groomParents || "Mr. & Mrs. [Groom Parents]"}</div>
                  </div>
                  <div className="parent-section">
                    <div className="parent-name">{branding?.brideParents || clientConfig?.brideParents || "Mr. & Mrs. [Bride Parents]"}</div>
                  </div>
                </div>

                <div className="invitation-text">
                  HAVE THE PLEASURE TO INVITE YOU TO THE
                  <br />
                  WEDDING CEREMONY OF THEIR BELOVED
                  <br />
                  SON & DAUGHTER
                </div>

                <div className="couple-names">{branding?.coupleName || clientConfig?.coupleName || "The Couple"}</div>

                <div className="wedding-details">
                  <div className="wedding-day">
                    {(branding?.weddingDate || clientConfig?.weddingDate)
                      ? new Date(branding?.weddingDate || clientConfig?.weddingDate).toLocaleDateString("en-US", { weekday: "long" }).toUpperCase()
                      : "SATURDAY"}
                  </div>
                  <div className="wedding-date">
                    {(branding?.weddingDate || clientConfig?.weddingDate)
                      ? new Date(branding?.weddingDate || clientConfig?.weddingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }).toUpperCase().replace(/ /g, " | ")
                      : "25 | JULY | 2026"}
                  </div>
                  <div className="wedding-time">AT {branding?.weddingTime || clientConfig?.weddingTime || "7:00 PM"}</div>
                  <div className="wedding-venue">{(branding?.venue || clientConfig?.venue || "YARZEH OFFICERS CLUB").toUpperCase()}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
