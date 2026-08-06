import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "../config/api";
import BackgroundImageLoader from "../components/BackgroundImageLoader";
import "./Guest.css";

const Guest = ({ familyId, onDataLoaded, onGiftRegistryLoaded }) => {
  const containerRef = useRef(null);
  const [guests, setGuests] = useState([]);
  const [family, setFamily] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [familyNotFound, setFamilyNotFound] = useState(true); // Default to true for new family mode
  const [newGuests, setNewGuests] = useState([{ name: "", attending: null }]);
  const [createdFamilyId, setCreatedFamilyId] = useState(null); // Store created family ID
  const [copySuccess, setCopySuccess] = useState(false); // Track copy success
  const [modal, setModal] = useState({
    show: false,
    message: "",
    isSuccess: false,
  });

  const handleAttendingToggle = (index, status) => {
    if (familyNotFound) {
      // Handle new guests
      setNewGuests(
        newGuests.map((guest, i) =>
          i === index ? { ...guest, attending: status } : guest,
        ),
      );
    } else {
      // Handle existing guests
      setGuests(
        guests.map((guest, i) =>
          i === index ? { ...guest, attending: status } : guest,
        ),
      );
    }
  };

  const handleNameChange = (index, name) => {
    setNewGuests(
      newGuests.map((guest, i) => (i === index ? { ...guest, name } : guest)),
    );
  };

  const addNewGuestField = () => {
    setNewGuests([...newGuests, { name: "", attending: null }]);
  };

  const removeGuestField = (index) => {
    if (newGuests.length > 1) {
      setNewGuests(newGuests.filter((_, i) => i !== index));
    }
  };

  const showModal = (message, isSuccess = false, familyId = null) => {
    setModal({ show: true, message, isSuccess });
    setCreatedFamilyId(familyId);
    setCopySuccess(false); // Reset copy success state
  };

  const hideModal = () => {
    setModal({ show: false, message: "", isSuccess: false });
    setCreatedFamilyId(null);
    setCopySuccess(false);
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (fallbackErr) {
        console.error("Failed to copy text: ", fallbackErr);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (familyNotFound) {
        // Create new family with guests
        const validGuests = newGuests.filter(
          (guest) => guest.name.trim() !== "" && guest.attending !== null,
        );

        if (validGuests.length === 0) {
          showModal(
            "Please add at least one guest with a name and attendance choice.",
            false,
          );
          setIsSubmitting(false);
          return;
        }

        // Create new family (MongoDB will generate _id automatically)
        const attendeesWithIds = validGuests.map((guest, index) => ({
          guestId: index + 1,
          name: guest.name.trim(),
          attending: guest.attending,
        }));

        console.log("🔄 Creating new family...", {
          attendees: attendeesWithIds,
        });

        const response = await axios.post(API_ENDPOINTS.CREATE_FAMILY(), {
          attendees: attendeesWithIds,
          giftRegistry: false,
        });

        console.log("✅ New family created successfully:", response.data);
        const newFamilyId = response.data._id; // Get the MongoDB _id

        showModal(
          `RSVP submitted successfully! Your family ID has been generated. Please save this ID for future reference.`,
          true,
          newFamilyId,
        );
      } else {
        // Update existing family
        console.log("🔄 Submitting RSVP...", {
          familyId,
          endpoint: API_ENDPOINTS.UPDATE_FAMILY(familyId),
          attendees: guests,
          giftRegistry: family?.giftRegistry,
        });

        const response = await axios.put(
          API_ENDPOINTS.UPDATE_FAMILY(familyId),
          {
            attendees: guests,
            giftRegistry: family?.giftRegistry,
          },
        );

        console.log("✅ RSVP submitted successfully:", response.data);
        showModal(
          "RSVP submitted successfully! Thank you for your response.",
          true,
        );
      }
    } catch (error) {
      console.error("❌ Error while updating RSVP:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const errorMessage =
        error.response?.data?.message ||
        `Failed to submit RSVP. Please try again. (${error.response?.status || "Network Error"})`;

      showModal(errorMessage, false);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      // Default to new family mode if no familyId provided
      if (!familyId || familyId === null || familyId === undefined) {
        console.log("No familyId provided, defaulting to new family mode");
        setFamilyNotFound(true);
        // Call onDataLoaded since no fetch is needed
        if (onDataLoaded) onDataLoaded(true);
        return;
      }

      try {
        console.log("Fetching family data for ID:", familyId);
        const response = await axios.get(API_ENDPOINTS.GET_FAMILY(familyId));
        setFamily(response.data);
        setGuests(response.data.attendees || []);
        setFamilyNotFound(false);
        if (onGiftRegistryLoaded) onGiftRegistryLoaded(response.data.giftRegistry ?? true);
        console.log("Successfully loaded existing family data");
      } catch (error) {
        console.log(
          "Error while fetching family data, switching to new family mode:",
          error.message,
        );
        if (error.response?.status === 404 || error.response?.status === 400) {
          setFamilyNotFound(true);
        }
      } finally {
        // Always call onDataLoaded when fetch is complete (success or error)
        if (onDataLoaded) onDataLoaded(true);
      }
    };
    fetchData();
  }, [familyId, onDataLoaded]);

  const currentGuests = familyNotFound ? newGuests : guests;

  return (
    <div className="rsvp-container" ref={containerRef}>
      <BackgroundImageLoader
        images={["../../public../../public/yarze.png"]}
        component="rsvp"
      />
      <div className="location-header">
        <h1 className="rsvp-title">RSVP</h1>
        <p className="rsvp-subtitle">
          {familyNotFound
            ? "Please enter your information below to RSVP for our wedding"
            : "Will you be able to attend our wedding?"}
        </p>
      </div>

      {familyNotFound && (
        <div className="new-family-notice">
          <p>
            {!familyId
              ? "Welcome! Please enter your information below to RSVP for our wedding:"
              : "We couldn't find your family ID, but you can still RSVP by entering your details below:"}
          </p>
        </div>
      )}

      <div className="guest-list">
        {currentGuests.map((guest, index) => (
          <div key={index} className="guest-item rsvp-radio">
            <div className="guest-info">
              {familyNotFound ? (
                <div className="guest-name-input">
                  <input
                    type="text"
                    placeholder="Enter guest name"
                    value={guest.name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    className="guest-name-field"
                  />
                  {newGuests.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGuestField(index)}
                      className="remove-guest-btn"
                      title="Remove guest">
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <span className="guest-name">{guest.name}</span>
              )}
            </div>

            <div className="guest-buttons">
              <button
                type="button"
                onClick={() => handleAttendingToggle(index, true)}
                className={`rsvp-choice ${
                  guest.attending === true ? "active" : ""
                }`}>
                Yes
              </button>

              <button
                type="button"
                onClick={() => handleAttendingToggle(index, false)}
                className={`rsvp-choice ${
                  guest.attending === false ? "active" : ""
                }`}>
                No
              </button>
            </div>
          </div>
        ))}
      </div>

      {familyNotFound && (
        <button
          type="button"
          onClick={addNewGuestField}
          className="add-guest-btn">
          + Add Another Guest
        </button>
      )}

      <button
        className="rsvp-submit"
        onClick={handleSubmit}
        disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Responses"}
      </button>

      {/* Custom Modal */}
      {modal.show && (
        <div className="modal-overlay" onClick={hideModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-body">
              <div className="modal-message">{modal.message}</div>

              {/* Show URL with copy button for new family creation */}
              {createdFamilyId && (
                <div className="uuid-container">
                  <div className="uuid-label">Your RSVP Link:</div>
                  <div className="uuid-display">
                    <code className="uuid-text">{`https://anthony-and-perla.sparklink.cards/?familyId=${createdFamilyId}`}</code>
                    <button
                      className={`copy-btn ${copySuccess ? "copied" : ""}`}
                      onClick={() =>
                        copyToClipboard(
                          `We're so happy to share this special moment with you 🤍\n\nOur big day is on July 25 2026, and it would truly mean the world to us to have you there. \n\nPlease find our invitation card at the link below for all the details.\nWe really hope you can join us on this unforgettable day!\n\nhttps://anthony-and-perla.sparklink.cards/?familyId=${createdFamilyId}\n\nPlease confirm before July 1st  🤍`,
                        )
                      }
                      title="Copy RSVP Link">
                      {copySuccess ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <div className="uuid-note">
                    Save this link to update your RSVP later or view your
                    response.
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-ok-button" onClick={hideModal}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Guest;
