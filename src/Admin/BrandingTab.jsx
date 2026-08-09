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
  const [branding,   setBranding]   = useState({ accentColor: "#800020", backgroundColor: "#f7f1f1", textColor: "#4a3a3f", fontFamily: "Playfair Display", couplePhotos: [], venuePhotos: [], flipPhotos: [] });
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [error,      setError]      = useState("");
  const [activeSection, setActiveSection] = useState("colors");
  const [uploadingKey, setUploadingKey] = useState(null);
  const scrollRef = useRef(null);

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
      update({ [categoryKey]: multi ? [...(branding[categoryKey] || []), ...compressed] : [compressed[0]] });
    } finally {
      setUploadingKey(null);
      e.target.value = "";
    }
  };

  const removeImage = (categoryKey, index) => {
    const updated = [...(branding[categoryKey] || [])];
    updated.splice(index, 1);
    update({ [categoryKey]: updated });
  };

  const SECTIONS = ["colors", "fonts", "photos"];

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
              <span>{s === "colors" ? "Colors" : s === "fonts" ? "Fonts" : "Photos"}</span>
            </button>
          ))}
        </div>

        {/* Center: content */}
        <div className="brand-content" ref={scrollRef}>

          {/* ── Colors ── */}
          {activeSection === "colors" && (
            <div className="brand-section">
              <h3 className="brand-section-title">Color Theme</h3>
              <p className="brand-section-desc">Choose a preset palette or customize each color individually.</p>

              <div className="brand-palettes">
                {COLOR_PALETTES.map((p) => (
                  <button
                    key={p.name}
                    className={`brand-palette-card ${p.accent && branding.accentColor === p.accent ? "active" : ""} ${p.accent === null ? "brand-palette-custom" : ""}`}
                    onClick={() => { if (p.accent) update({ accentColor: p.accent, backgroundColor: p.bg, textColor: p.text }); }}
                    title={p.name}>
                    {p.accent ? (
                      <>
                        <div className="brand-palette-swatches">
                          <span style={{ background: p.accent }} />
                          <span style={{ background: p.bg }} />
                          <span style={{ background: p.text }} />
                        </div>
                        <div className="brand-palette-name">{p.name}</div>
                      </>
                    ) : (
                      <div className="brand-palette-name">Custom ✏️</div>
                    )}
                  </button>
                ))}
              </div>

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

                  {(branding[key] || []).length > 0 ? (
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: live preview */}
        <div className="brand-preview-panel">
          <InvitationPreview branding={branding} clientConfig={clientConfig} />
        </div>
      </div>
    </div>
  );
}
