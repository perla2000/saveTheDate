import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";
import { API_ENDPOINTS } from "../config/api";

const BrandingContext = createContext(null);

const FONT_URLS = {
  "Playfair Display":   "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap",
  "Cormorant Garamond": "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap",
  "Great Vibes":        "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
  "Lora":               "https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap",
  "Libre Baskerville":  "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  "Cinzel":             "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap",
  "EB Garamond":        "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap",
  "Merriweather":       "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
};

const DEFAULT_BRANDING = {
  accentColor:        "#800020",
  backgroundColor:    "#f7f1f1",
  textColor:          "#4a3a3f",
  fontFamily:         "Playfair Display",
  couplePhotos:       [],
  venuePhotos:        [],
  flipPhotos:         [],
  logo:               "",
  showLoadingScreen:  true,
  layoutOrientation:  "vertical",
  autoScrollEnabled:  true,
  // Text customization
  coupleName:         "",
  groomName:          "",
  brideName:          "",
  groomParents:       "",
  brideParents:       "",
  weddingDate:        "",
  weddingTime:        "",
  venue:              "",
  venueAddress:       "",
  giftAccountId:      "",
  giftPhoneNumber:    "",
  giftProviderName:   "",
  giftSubtitle:       "",
  giftDescription:    "",
  inviteMessageTemplate: "",
  saveTheDateSubtitle:"",
  saveTheDateTitle:   "",
  venueMapUrl:        "",
  venueMapEmbedUrl:   "",
  customPalettes:     [],
  sections: [
    { id: "intro",      label: "Intro",                     enabled: true, sortId: 0 },
    { id: "invitation", label: "Invitation",                enabled: true, sortId: 1 },
    { id: "countdown",  label: "Countdown / Save the Date", enabled: true, sortId: 2 },
    { id: "timeline",   label: "Timeline",                  enabled: true, sortId: 3 },
    { id: "location",   label: "Location",                  enabled: true, sortId: 4 },
    { id: "rsvp",       label: "RSVP",                      enabled: true, sortId: 5 },
    { id: "lovestory",  label: "Love Story",                enabled: true, sortId: 6 },
  ],
};

export const applyBrandingCSS = (branding) => {
  if (!branding) return;
  const root = document.documentElement;
  if (branding.accentColor)     root.style.setProperty("--brand-accent", branding.accentColor);
  if (branding.backgroundColor) root.style.setProperty("--brand-bg",     branding.backgroundColor);
  if (branding.textColor)       root.style.setProperty("--brand-text",   branding.textColor);
  if (branding.fontFamily) {
    root.style.setProperty("--brand-font", `'${branding.fontFamily}', serif`);
    const url = FONT_URLS[branding.fontFamily];
    if (url && !document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }
  // Apply layout orientation as CSS class on body
  if (branding.layoutOrientation) {
    document.body.classList.remove("layout-vertical", "layout-horizontal");
    document.body.classList.add(`layout-${branding.layoutOrientation}`);
  }
};

export const BrandingProvider = ({ children }) => {
  const [branding, setBranding] = useState(DEFAULT_BRANDING);

  useEffect(() => {
    // Apply default layout class immediately
    document.body.classList.add("layout-vertical");
    
    axios.get(API_ENDPOINTS.GET_BRANDING())
      .then((r) => {
        const data = { ...DEFAULT_BRANDING, ...r.data };
        setBranding(data);
        applyBrandingCSS(data);
      })
      .catch(() => {});

    // Listen for live updates posted from admin branding tab
    const handler = (e) => {
      if (e.data?.type === "BRANDING_UPDATE") {
        const data = { ...DEFAULT_BRANDING, ...e.data.branding };
        setBranding(data);
        applyBrandingCSS(data);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
};

export const useBranding = () => useContext(BrandingContext);
