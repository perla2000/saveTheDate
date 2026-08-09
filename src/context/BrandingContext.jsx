import axios from "axios";
import { createContext, useContext, useEffect } from "react";
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

export const applyBranding = (branding) => {
  if (!branding) return;
  const root = document.documentElement;
  if (branding.accentColor)     root.style.setProperty("--brand-accent", branding.accentColor);
  if (branding.backgroundColor) root.style.setProperty("--brand-bg",     branding.backgroundColor);
  if (branding.textColor)       root.style.setProperty("--brand-text",   branding.textColor);
  if (branding.fontFamily) {
    root.style.setProperty("--brand-font", `'${branding.fontFamily}', serif`);
    // Load the font if not already loaded
    const url = FONT_URLS[branding.fontFamily];
    if (url && !document.querySelector(`link[href="${url}"]`)) {
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }
  }
};

export const BrandingProvider = ({ children }) => {
  useEffect(() => {
    // Load branding from API and apply CSS vars
    axios.get(API_ENDPOINTS.GET_BRANDING())
      .then((r) => applyBranding(r.data))
      .catch(() => {});

    // Listen for live updates from the admin iframe parent
    const handler = (e) => {
      if (e.data?.type === "BRANDING_UPDATE") {
        applyBranding(e.data.branding);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return <BrandingContext.Provider value={null}>{children}</BrandingContext.Provider>;
};

export const useBranding = () => useContext(BrandingContext);
