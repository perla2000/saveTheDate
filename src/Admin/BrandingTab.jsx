import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "../config/api";
import "./BrandingTab.css";

// ── Constants ─────────────────────────────────────────────────────────────────

const COLOR_PALETTES = [
  { name: "Burgundy",   accent: "#800020", bg: "#f7f1f1", text: "#4a3a3f" },
  { name: "Rose Gold",  accent: "#b76e79", bg: "#fdf6f0", text: "#5c3d3d" },
  { name: "Navy",       accent: "#1b3a6b", bg: "#f0f4f8", text: "#1a2a3a" },
  { name: "Sage",       accent: "#7a9e7e", bg: "#f4f7f4", text: "#2d3d2d" },
  { name: "Gold",       accent: "#c9a84c", bg: "#fdf8ec", text: "#3d3010" },
  { name: "Dusty Rose", accent: "#c9a0a0", bg: "#fdf4f4", text: "#5c3535" },
  { name: "Black",      accent: "#222222", bg: "#f8f8f8", text: "#222222" },
  { name: "Custom",     accent: null,      bg: null,      text: null      },
];

const FONTS = [
  "Playfair Display",
  "Cormorant Garamond",
  "Great Vibes",
  "Lora",
  "Libre Baskerville",
  "Cinzel",
  "EB Garamond",
  "Merriweather",
];

const FONT_URLS = {
  "Playfair Display":    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600&display=swap",
  "Cormorant Garamond":  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&display=swap",
  "Great Vibes":         "https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap",
  "Lora":                "https://fonts.googleapis.com/css2?family=Lora:wght@400;600&display=swap",
  "Libre Baskerville":   "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
  "Cinzel":              "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&display=swap",
  "EB Garamond":         "https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;600&display=swap",
  "Merriweather":        "https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap",
};

const IMAGE_CATEGORIES = [
  { key: "logo",         label: "Logo",           icon: "photos", desc: "Your wedding logo (shown on invitation)",  multi: false },
  { key: "couplePhotos", label: "Couple Photos",  icon: "couple",  desc: "Displayed on the invitation front",      multi: true  },
  { key: "venuePhotos",  label: "Venue Photos",   icon: "venue",   desc: "Used as background image",               multi: false },
  { key: "flipPhotos",   label: "Flip Photos",    icon: "gallery", desc: "Scrolling photo wall on save-the-date",  multi: true  },
];

// ── Icon set ──────────────────────────────────────────────────────────────────

const Icon = ({ name, size = 18 }) => {
  const icons = {
    colors: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 1 9 9" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    fonts: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 7 4 4 20 4 20 7" />
        <line x1="9" y1="20" x2="15" y2="20" />
        <line x1="12" y1="4" x2="12" y2="20" />
      </svg>
    ),
    photos: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21 15 16 10 5 21" />
      </svg>
    ),
    couple: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" />
        <circle cx="15" cy="7" r="3" />
        <path d="M3 21v-1a6 6 0 0 1 6-6h1" />
        <path d="M21 21v-1a6 6 0 0 0-6-6h-1" />
      </svg>
    ),
    venue: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="21" x2="21" y2="21" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="5 10 5 3 19 3 19 10" />
        <rect x="9" y="14" width="6" height="7" />
      </svg>
    ),
    gallery: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="9" height="9" rx="1" />
        <rect x="13" y="2" width="9" height="9" rx="1" />
        <rect x="2" y="13" width="9" height="9" rx="1" />
        <rect x="13" y="13" width="9" height="9" rx="1" />
      </svg>
    ),
    settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
    text: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 7V4h16v3" />
        <path d="M9 20h6" />
        <path d="M12 4v16" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const compressImage = (file, maxWidth = 800, quality = 0.75) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale  = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

// ── Mini Invitation Preview ───────────────────────────────────────────────────

function InvitationPreview({ branding, clientConfig }) {
  const [flipped, setFlipped] = useState(false);
  const couplePhoto = branding.couplePhotos?.[0];
  const venuePhoto  = branding.venuePhotos?.[0];

  return (
    <div className="brand-preview-wrapper">
      <div className="brand-preview-label">Live Preview</div>
      <div
        className={`brand-preview-card ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        style={{ "--accent": branding.accentColor, "--bg": branding.backgroundColor, "--text": branding.textColor, fontFamily: `'${branding.fontFamily}', serif` }}>

        {/* Front */}
        <div className="brand-preview-side brand-preview-front"
          style={{ backgroundImage: couplePhoto ? `url(${couplePhoto})` : "none", backgroundColor: branding.backgroundColor }}>
          {!couplePhoto && (
            <div className="brand-preview-placeholder">💑<br/>Couple Photo</div>
          )}
          <div className="brand-preview-tap">Tap to flip</div>
        </div>

        {/* Back */}
        <div className="brand-preview-side brand-preview-back"
          style={{
            backgroundImage: venuePhoto
              ? `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${venuePhoto})`
              : "none",
            backgroundColor: branding.backgroundColor,
          }}>
          <div className="brand-preview-back-content">
            <div className="brand-preview-eyebrow" style={{ color: branding.accentColor }}>WITH JOYOUS HEARTS</div>
            <div className="brand-preview-names" style={{ color: venuePhoto ? "#fff" : branding.textColor }}>
              {clientConfig?.groomName || "Groom"} &amp; {clientConfig?.brideName || "Bride"}
            </div>
            <div className="brand-preview-date" style={{ color: venuePhoto ? "rgba(255,255,255,0.85)" : branding.textColor }}>
              {clientConfig?.weddingDate
                ? new Date(clientConfig.weddingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
                : "Date TBD"}
            </div>
            <div className="brand-preview-venue" style={{ color: venuePhoto ? "rgba(255,255,255,0.75)" : branding.textColor }}>
              {clientConfig?.venue || "Venue"}
            </div>
          </div>
        </div>
      </div>
      <div className="brand-preview-hint">Click card to flip</div>
    </div>
  );
}

// ── Main BrandingTab ──────────────────────────────────────────────────────────

export default function BrandingTab({ clientConfig }) {
  const DEFAULT_SECTIONS = [
    { id: "intro",      label: "Intro",                     enabled: true, order: 0 },
    { id: "invitation", label: "Invitation",                enabled: true, order: 1 },
    { id: "countdown",  label: "Countdown / Save the Date", enabled: true, order: 2 },
    { id: "timeline",   label: "Timeline",                  enabled: true, order: 3 },
    { id: "location",   label: "Location",                  enabled: true, order: 4 },
    { id: "rsvp",       label: "RSVP",                      enabled: true, order: 5 },
    { id: "lovestory",  label: "Love Story",                enabled: true, order: 6 },
  ];

  const [branding, setBranding] = useState({ accentColor: "#800020", backgroundColor: "#f7f1f1", textColor: "#4a3a3f", fontFamily: "Playfair Display", couplePhotos: [], venuePhotos: [], flipPhotos: [], logo: "", showLoadingScreen: true, layoutOrientation: "vertical", autoScrollEnabled: true, coupleName: "", groomName: "", brideName: "", groomParents: "", brideParents: "", weddingDate: "", weddingTime: "", venue: "", venueAddress: "", giftAccountId: "", giftPhoneNumber: "", giftProviderName: "", saveTheDateSubtitle: "", saveTheDateTitle: "", venueMapUrl: "", venueMapEmbedUrl: "", customPalettes: [], sections: DEFAULT_SECTIONS });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [activeSection, setActiveSection] = useState("colors");
  const [uploadingKey, setUploadingKey] = useState(null);
  const scrollRef = useRef(null);
  
  // State for adding custom palette
  const [showPaletteForm, setShowPaletteForm] = useState(false);
  const [newPalette, setNewPalette] = useState({ name: "", accent: "#800020", bg: "#f7f1f1", text: "#4a3a3f" });

  // Load branding on mount
  useEffect(() => {
    axios.get(API_ENDPOINTS.GET_BRANDING())
      .then((r) => setBranding(r.data))
      .catch(() => setError("Could not load branding settings."))
      .finally(() => setLoading(false));
  }, []);

  // Load Google Fonts when font changes
  useEffect(() => {
    const url = FONT_URLS[branding.fontFamily];
    if (!url) return;
    if (document.querySelector(`link[href="${url}"]`)) return;
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }, [branding.fontFamily]);

  const update = (patch) => setBranding((b) => ({ ...b, ...patch }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await axios.put(API_ENDPOINTS.UPDATE_BRANDING(), branding);
      setBranding(res.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save branding.");
    } finally {
      setSaving(false);
    }
  };

  // Image upload handler
  const handleImageUpload = async (e, categoryKey, multi) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploadingKey(categoryKey);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f, categoryKey === "flipPhotos" ? 600 : 900, 0.75)));
      // Handle logo as single string, others as arrays
      if (categoryKey === "logo") {
        update({ logo: compressed[0] });
      } else {
        update({ [categoryKey]: multi ? [...(branding[categoryKey] || []), ...compressed] : [compressed[0]] });
      }
    } finally {
      setUploadingKey(null);
      e.target.value = "";
    }
  };

  const removeImage = (categoryKey, index) => {
    if (categoryKey === "logo") {
      update({ logo: "" });
    } else {
      const updated = [...(branding[categoryKey] || [])];
      updated.splice(index, 1);
      update({ [categoryKey]: updated });
    }
  };

  const addCustomPalette = () => {
    if (!newPalette.name.trim()) {
      alert("Please enter a palette name");
      return;
    }
    const customPalettes = [...(branding.customPalettes || []), newPalette];
    update({ customPalettes });
    setNewPalette({ name: "", accent: "#800020", bg: "#f7f1f1", text: "#4a3a3f" });
    setShowPaletteForm(false);
  };

  const removeCustomPalette = (index) => {
    const customPalettes = [...(branding.customPalettes || [])];
    customPalettes.splice(index, 1);
    update({ customPalettes });
  };

  // Section helpers
  const getSections = () => {
    const saved = branding.sections || [];
    // Merge with defaults so new sections always appear
    const merged = DEFAULT_SECTIONS.map((def) => {
      const found = saved.find((s) => s.id === def.id);
      return found ? { ...def, ...found } : def;
    });
    return [...merged].sort((a, b) => a.order - b.order);
  };

  const toggleSection = (id) => {
    const updated = getSections().map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    update({ sections: updated });
  };

  const moveSection = (id, dir) => {
    const list = getSections();
    const idx = list.findIndex((s) => s.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const reordered = list.map((s, i) => {
      if (i === idx)     return { ...s, order: list[swapIdx].order };
      if (i === swapIdx) return { ...s, order: list[idx].order };
      return s;
    }).sort((a, b) => a.order - b.order)
      .map((s, i) => ({ ...s, order: i }));
    update({ sections: reordered });
  };

  const SECTIONS = ["colors", "fonts", "photos", "text", "settings", "sections"];

  if (loading) return <div className="brand-loading">Loading branding…</div>;

  return (
    <div className="brand-tab">

      {/* ── Top: save bar ── */}
      <div className="brand-save-bar">
        <div className="brand-save-bar-left">
          <span className="brand-save-title">Branding & Appearance</span>
          {saved && <span className="brand-saved-badge">✓ Saved</span>}
        </div>
        {error && <span className="brand-error-inline">{error}</span>}
        <button className="admin-btn admin-btn-primary" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Layout: sections nav + content + preview ── */}
      <div className="brand-layout">

        {/* Left: section nav */}
        <div className="brand-section-nav">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`brand-section-btn ${activeSection === s ? "active" : ""}`}>
              <Icon name={s} size={16} />
              <span>{s === "colors" ? "Colors" : s === "fonts" ? "Fonts" : s === "photos" ? "Photos" : s === "text" ? "Text" : s === "settings" ? "Settings" : "Sections"}</span>
            </button>
          ))}
        </div>

        {/* Center: content */}
        <div className="brand-content" ref={scrollRef}>

          {/* ── Colors ── */}
          {activeSection === "colors" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Color Theme</h3>
              <p className="brand-section-desc">Choose a preset palette, use your custom palettes, or customize colors individually.</p>

              <div className="brand-palettes">
                {COLOR_PALETTES.filter(p => p.accent !== null).map((p) => (
                  <button
                    key={p.name}
                    className={`brand-palette-card ${branding.accentColor === p.accent ? "active" : ""}`}
                    onClick={() => update({ accentColor: p.accent, backgroundColor: p.bg, textColor: p.text })}
                    title={p.name}>
                    <div className="brand-palette-swatches">
                      <span style={{ background: p.accent }} />
                      <span style={{ background: p.bg }} />
                      <span style={{ background: p.text }} />
                    </div>
                    <div className="brand-palette-name">{p.name}</div>
                  </button>
                ))}
              </div>

              {/* Custom Palettes */}
              {branding.customPalettes && branding.customPalettes.length > 0 && (
                <>
                  <h4 style={{ marginTop: "2rem", marginBottom: "1rem", fontSize: "0.95rem", fontWeight: 600 }}>Your Custom Palettes</h4>
                  <div className="brand-palettes">
                    {branding.customPalettes.map((p, index) => (
                      <button
                        key={index}
                        className={`brand-palette-card ${branding.accentColor === p.accent ? "active" : ""}`}
                        onClick={() => update({ accentColor: p.accent, backgroundColor: p.bg, textColor: p.text })}
                        title={p.name}>
                        <div className="brand-palette-swatches">
                          <span style={{ background: p.accent }} />
                          <span style={{ background: p.bg }} />
                          <span style={{ background: p.text }} />
                        </div>
                        <div className="brand-palette-name">{p.name}</div>
                        <button
                          className="brand-palette-remove"
                          onClick={(e) => { e.stopPropagation(); removeCustomPalette(index); }}
                          title="Remove palette">✕</button>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Add Custom Palette Button/Form */}
              {!showPaletteForm ? (
                <button
                  className="admin-btn admin-btn-ghost"
                  style={{ marginTop: "1.5rem" }}
                  onClick={() => setShowPaletteForm(true)}>
                  + Add Custom Palette
                </button>
              ) : (
                <div className="brand-palette-form">
                  <h4 style={{ marginBottom: "1rem", fontSize: "0.95rem", fontWeight: 600 }}>Create Custom Palette</h4>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Palette Name</label>
                      <input
                        type="text"
                        value={newPalette.name}
                        onChange={(e) => setNewPalette({ ...newPalette, name: e.target.value })}
                        placeholder="e.g., My Wedding Theme"
                        style={{ width: "100%", padding: "0.5rem", border: "1px solid #ddd", borderRadius: "4px" }}
                      />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Accent Color</label>
                        <input
                          type="color"
                          value={newPalette.accent}
                          onChange={(e) => setNewPalette({ ...newPalette, accent: e.target.value })}
                          style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Background</label>
                        <input
                          type="color"
                          value={newPalette.bg}
                          onChange={(e) => setNewPalette({ ...newPalette, bg: e.target.value })}
                          style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.85rem", fontWeight: 500 }}>Text Color</label>
                        <input
                          type="color"
                          value={newPalette.text}
                          onChange={(e) => setNewPalette({ ...newPalette, text: e.target.value })}
                          style={{ width: "100%", height: "40px", border: "1px solid #ddd", borderRadius: "4px", cursor: "pointer" }}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="admin-btn admin-btn-primary" onClick={addCustomPalette}>Add Palette</button>
                      <button className="admin-btn admin-btn-ghost" onClick={() => setShowPaletteForm(false)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <div className="brand-custom-colors">
                <div className="brand-color-row">
                  <label>Accent Color</label>
                  <div className="brand-color-input-group">
                    <input type="color" value={branding.accentColor} onChange={(e) => update({ accentColor: e.target.value })} />
                    <input type="text" value={branding.accentColor} onChange={(e) => update({ accentColor: e.target.value })} className="brand-hex-input" maxLength={7} />
                  </div>
                </div>
                <div className="brand-color-row">
                  <label>Background Color</label>
                  <div className="brand-color-input-group">
                    <input type="color" value={branding.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} />
                    <input type="text" value={branding.backgroundColor} onChange={(e) => update({ backgroundColor: e.target.value })} className="brand-hex-input" maxLength={7} />
                  </div>
                </div>
                <div className="brand-color-row">
                  <label>Text Color</label>
                  <div className="brand-color-input-group">
                    <input type="color" value={branding.textColor} onChange={(e) => update({ textColor: e.target.value })} />
                    <input type="text" value={branding.textColor} onChange={(e) => update({ textColor: e.target.value })} className="brand-hex-input" maxLength={7} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Fonts ── */}
          {activeSection === "fonts" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Typography</h3>
              <p className="brand-section-desc">Select the font used across the invitation card.</p>
              <div className="brand-fonts-grid">
                {FONTS.map((font) => (
                  <button
                    key={font}
                    className={`brand-font-card ${branding.fontFamily === font ? "active" : ""}`}
                    style={{ fontFamily: `'${font}', serif` }}
                    onClick={() => update({ fontFamily: font })}>
                    <div className="brand-font-sample">Aa</div>
                    <div className="brand-font-name">{font}</div>
                    <div className="brand-font-preview" style={{ fontFamily: `'${font}', serif` }}>
                      {clientConfig?.groomName || "Justin"} &amp; {clientConfig?.brideName || "Yara"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Photos ── */}
          {activeSection === "photos" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Photo Categories</h3>
              <p className="brand-section-desc">Upload photos for each section. Images are compressed automatically.</p>

              {IMAGE_CATEGORIES.map(({ key, label, icon, desc, multi }) => (
                <div key={key} className="brand-photo-category">
                  <div className="brand-photo-category-header">
                    <span className="brand-photo-icon"><Icon name={icon} size={20} /></span>
                    <div>
                      <div className="brand-photo-label">{label}</div>
                      <div className="brand-photo-desc">{desc}</div>
                    </div>
                    <label className={`admin-btn admin-btn-ghost brand-upload-btn ${uploadingKey === key ? "uploading" : ""}`}>
                      {uploadingKey === key ? "Uploading…" : `+ Upload`}
                      <input
                        type="file"
                        accept="image/*"
                        multiple={multi}
                        style={{ display: "none" }}
                        onChange={(e) => handleImageUpload(e, key, multi)}
                        disabled={uploadingKey !== null}
                      />
                    </label>
                  </div>

                  {key === "logo" ? (
                    // Logo is single image, not array
                    branding.logo ? (
                      <div className="brand-photo-grid">
                        <div className="brand-photo-thumb">
                          <img src={branding.logo} alt="Logo" />
                          <button className="brand-photo-remove" onClick={() => removeImage(key)} title="Remove">✕</button>
                        </div>
                      </div>
                    ) : (
                      <div className="brand-photo-empty">No logo yet. Click Upload to add.</div>
                    )
                  ) : (
                    // Other categories are arrays
                    (branding[key] || []).length > 0 ? (
                      <div className="brand-photo-grid">
                        {(branding[key] || []).map((src, i) => (
                          <div key={i} className="brand-photo-thumb">
                            <img src={src} alt={`${label} ${i + 1}`} />
                            <button className="brand-photo-remove" onClick={() => removeImage(key, i)} title="Remove">✕</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="brand-photo-empty">No photos yet. Click Upload to add.</div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── Text ── */}
          {activeSection === "text" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Text Customization</h3>
              <p className="brand-section-desc">Customize all text shown on the invitation. Leave blank to use default values from client config.</p>

              <div className="brand-text-group">
                <h4 className="brand-text-group-title">Couple Information</h4>
                <div className="brand-text-field">
                  <label>Couple Names (e.g., "Justin & Yara")</label>
                  <input type="text" value={branding.coupleName || ""} onChange={(e) => update({ coupleName: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Groom Name</label>
                  <input type="text" value={branding.groomName || ""} onChange={(e) => update({ groomName: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Bride Name</label>
                  <input type="text" value={branding.brideName || ""} onChange={(e) => update({ brideName: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Groom's Parents</label>
                  <input type="text" value={branding.groomParents || ""} onChange={(e) => update({ groomParents: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Bride's Parents</label>
                  <input type="text" value={branding.brideParents || ""} onChange={(e) => update({ brideParents: e.target.value })} placeholder="Leave blank for default" />
                </div>
              </div>

              <div className="brand-text-group">
                <h4 className="brand-text-group-title">Wedding Details</h4>
                <div className="brand-text-field">
                  <label>Wedding Date (YYYY-MM-DD)</label>
                  <input type="date" value={branding.weddingDate || ""} onChange={(e) => update({ weddingDate: e.target.value })} />
                </div>
                <div className="brand-text-field">
                  <label>Wedding Time (HH:MM)</label>
                  <input type="time" value={branding.weddingTime || ""} onChange={(e) => update({ weddingTime: e.target.value })} />
                </div>
                <div className="brand-text-field">
                  <label>Venue Name</label>
                  <input type="text" value={branding.venue || ""} onChange={(e) => update({ venue: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Venue Address</label>
                  <input type="text" value={branding.venueAddress || ""} onChange={(e) => update({ venueAddress: e.target.value })} placeholder="Leave blank for default" />
                </div>
              </div>

              <div className="brand-text-group">
                <h4 className="brand-text-group-title">Gift Registry</h4>
                <div className="brand-text-field">
                  <label>Gift Provider Name (e.g., "WhishMoney")</label>
                  <input type="text" value={branding.giftProviderName || ""} onChange={(e) => update({ giftProviderName: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Account ID</label>
                  <input type="text" value={branding.giftAccountId || ""} onChange={(e) => update({ giftAccountId: e.target.value })} placeholder="Leave blank for default" />
                </div>
                <div className="brand-text-field">
                  <label>Phone Number</label>
                  <input type="text" value={branding.giftPhoneNumber || ""} onChange={(e) => update({ giftPhoneNumber: e.target.value })} placeholder="Leave blank for default" />
                </div>
              </div>

              <div className="brand-text-group">
                <h4 className="brand-text-group-title">Save the Date Messages</h4>
                <div className="brand-text-field">
                  <label>Subtitle (top text)</label>
                  <input type="text" value={branding.saveTheDateSubtitle || ""} onChange={(e) => update({ saveTheDateSubtitle: e.target.value })} placeholder="e.g., A DECADE OF LOVE," />
                </div>
                <div className="brand-text-field">
                  <label>Title (bottom text)</label>
                  <input type="text" value={branding.saveTheDateTitle || ""} onChange={(e) => update({ saveTheDateTitle: e.target.value })} placeholder="e.g., A LIFETIME TO GO!" />
                </div>
              </div>

              <div className="brand-text-group">
                <h4 className="brand-text-group-title">Location & Maps</h4>
                <div className="brand-text-field">
                  <label>Google Maps URL (for "Get Directions" button)</label>
                  <input type="url" value={branding.venueMapUrl || ""} onChange={(e) => update({ venueMapUrl: e.target.value })} placeholder="https://maps.google.com/..." />
                </div>
                <div className="brand-text-field">
                  <label>Embedded Map URL (from Google Maps "Share {'>'} Embed")</label>
                  <input type="url" value={branding.venueMapEmbedUrl || ""} onChange={(e) => update({ venueMapEmbedUrl: e.target.value })} placeholder="https://www.google.com/maps/embed?pb=..." />
                </div>
              </div>
            </div>
          )}

          {/* ── Settings ── */}
          {activeSection === "settings" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Site Settings</h3>
              <p className="brand-section-desc">Control which features are shown to guests.</p>

              <div className="brand-setting-row">
                <div className="brand-setting-info">                  <div className="brand-setting-label">Loading Heart Screen</div>
                  <div className="brand-setting-desc">When enabled, guests see the animated heart before entering. Disable to open the invitation directly.</div>
                </div>
                <label className="brand-toggle">
                  <input
                    type="checkbox"
                    checked={branding.showLoadingScreen !== false}
                    onChange={(e) => update({ showLoadingScreen: e.target.checked })}
                  />
                  <span className="brand-toggle-slider" />
                </label>
              </div>

              <div className="brand-setting-row">
                <div className="brand-setting-info">
                  <div className="brand-setting-label">Layout Orientation</div>
                  <div className="brand-setting-desc">Vertical scrolls down, Horizontal enables left/right swipe navigation between pages.</div>
                </div>
                <div className="brand-orientation-btns">
                  <button
                    className={`brand-orientation-btn ${branding.layoutOrientation === "vertical" ? "active" : ""}`}
                    onClick={() => update({ layoutOrientation: "vertical" })}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="3" y1="9" x2="21" y2="9" />
                      <line x1="3" y1="15" x2="21" y2="15" />
                    </svg>
                    <span>Vertical</span>
                  </button>
                  <button
                    className={`brand-orientation-btn ${branding.layoutOrientation === "horizontal" ? "active" : ""}`}
                    onClick={() => update({ layoutOrientation: "horizontal" })}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                      <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                    <span>Horizontal</span>
                  </button>
                </div>
              </div>

              <div className="brand-setting-row">
                <div className="brand-setting-info">
                  <div className="brand-setting-label">Photo Auto-Scroll</div>
                  <div className="brand-setting-desc">When enabled, Save the Date shows scrolling photo grid. When disabled, displays a single featured photo.</div>
                </div>
                <label className="brand-toggle">
                  <input
                    type="checkbox"
                    checked={branding.autoScrollEnabled !== false}
                    onChange={(e) => update({ autoScrollEnabled: e.target.checked })}
                  />
                  <span className="brand-toggle-slider" />
                </label>
              </div>
            </div>
          )}

          {/* ── Sections ── */}
          {activeSection === "sections" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Page Sections</h3>
              <p className="brand-section-desc">Enable or disable each section and drag to reorder them.</p>

              <div className="brand-sections-list">
                {getSections().map((sec, idx, arr) => (
                  <div key={sec.id} className={`brand-section-row ${!sec.enabled ? "brand-section-row--disabled" : ""}`}>
                    <div className="brand-section-row-left">
                      <label className="brand-toggle brand-toggle-sm">
                        <input
                          type="checkbox"
                          checked={sec.enabled}
                          onChange={() => toggleSection(sec.id)}
                        />
                        <span className="brand-toggle-slider" />
                      </label>
                      <span className="brand-section-row-label">{sec.label}</span>
                    </div>
                    <div className="brand-section-row-actions">
                      <button
                        className="brand-sort-btn"
                        onClick={() => moveSection(sec.id, -1)}
                        disabled={idx === 0}
                        title="Move up">
                        ↑
                      </button>
                      <button
                        className="brand-sort-btn"
                        onClick={() => moveSection(sec.id, 1)}
                        disabled={idx === arr.length - 1}
                        title="Move down">
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: live preview */}
        {/* <div className="brand-preview-panel">
          <InvitationPreview branding={branding} clientConfig={clientConfig} />
        </div> */}
      </div>
    </div>
  );
}
