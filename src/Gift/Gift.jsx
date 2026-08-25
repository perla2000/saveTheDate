import { useMemo, useRef, useState } from "react";
import BackgroundImageLoader from "../components/BackgroundImageLoader";
import TrackedImage from "../components/TrackedImage";
import { useClient } from "../context/ClientContext";
import { useBranding } from "../context/BrandingContext";
import "./Gift.css";

const Gift = () => {
  const containerRef = useRef(null);
  const { clientConfig } = useClient();
  const branding = useBranding();
  const [copySuccess, setCopySuccess] = useState({
    account: false,
    phone: false,
  });
  const [copyMessage, setCopyMessage] = useState("");

  // Memoize the images array to prevent re-renders
  const backgroundImages = useMemo(() => ["/gift.png"], []);

  // Copy functions with success alerts
  const handleCopyAccount = async () => {
    try {
      const accountId = branding?.giftAccountId || clientConfig?.giftAccountId || "30935570-03";
      await navigator.clipboard.writeText(accountId);
      setCopyMessage("Account ID copied!");
      setCopySuccess((prev) => ({ ...prev, account: true }));
      setTimeout(() => {
        setCopySuccess((prev) => ({ ...prev, account: false }));
        setCopyMessage("");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy account ID:", err);
    }
  };

  const handleCopyPhone = async () => {
    try {
      const phoneNumber = branding?.giftPhoneNumber || clientConfig?.giftPhoneNumber || "+961 76 788 968";
      await navigator.clipboard.writeText(phoneNumber);
      setCopyMessage("Phone Number copied!");
      setCopySuccess((prev) => ({ ...prev, phone: true }));
      setTimeout(() => {
        setCopySuccess((prev) => ({ ...prev, phone: false }));
        setCopyMessage("");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy phone number:", err);
    }
  };

  return (
    <div className="gift-container" ref={containerRef}>
      <BackgroundImageLoader images={backgroundImages} component="gift" />
      <div className="gift-header">
        <h1 className="gift-title">Gift Registry</h1>
        <p className="gift-subtitle">
          {branding?.giftSubtitle || "Your presence at our wedding is truly the only gift we wish for."}
        </p>
      </div>

      <div className="gift-content">
        <div className="gift-message">
          <p className="gift-text">
            {branding?.giftDescription ||
              <>If you feel inclined to offer something further, a gift may be made
              through {branding?.giftProviderName || clientConfig?.giftProviderName || "WhishMoney"} using the details below. Please know that your
              love and support are more than enough.</>
            }
          </p>
          <p className="gift-names">{branding?.coupleName || clientConfig?.coupleName || "Justin & Yara"}</p>
          <div className="gift-signature"></div>
          <div className="gift-info-card">
            <div className="gift-logo">
              <TrackedImage
                src="/wish.png"
                alt="Gift Registry"
                className="wish-logo"
                component="gift"
              />
            </div>
            <h3>Gift Details</h3>
            <div className="account-info">
              <p>
                <strong>Account ID:</strong>
                <span className="account-value">{branding?.giftAccountId || clientConfig?.giftAccountId || "30935570-03"}</span>
                <button
                  className="copy-btn"
                  onClick={handleCopyAccount}
                  title="Copy Account ID">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </button>
                {copySuccess.account && (
                  <span className="copy-alert">{copyMessage}</span>
                )}
              </p>
            </div>

            <div className="account-info">
              <p>
                <strong>Number:</strong>
                <span className="account-value">{branding?.giftPhoneNumber || clientConfig?.giftPhoneNumber || "+961 76 788 968"}</span>
                <button
                  className="copy-btn"
                  onClick={handleCopyPhone}
                  title="Copy Phone Number">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                  </svg>
                </button>
                {copySuccess.phone && (
                  <span className="copy-alert">{copyMessage}</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gift;
