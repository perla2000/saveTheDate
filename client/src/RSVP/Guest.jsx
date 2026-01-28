import { useState, useEffect } from "react";
import axios from "axios";
import "./Guest.css";

const Guest = ({ guestId }) => {
  const [guests, setGuests] = useState([]);
  const handleAttendingToggle = (id, status) => {
    setGuests(
      guests.map((guest) =>
        guest._id === id ? { ...guest, attending: status } : guest
      )
    );
  };
  const handleSubmit = (id) => {
    const updateData = async (guests) => {
      try {
        await Promise.all(
          guests.map((guest) => {
            console.log(guest);
            axios.put(
              `http://localhost:8000/api/update/guest/${guest._id}`,
              guest
            );
          })
        );
      } catch (error) {
        console.log("Error while fetching data", error);
      }
    };
    updateData(guests);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/guestsById/${guestId}`
        );
        setGuests(response.data);
      } catch (error) {
        console.log("Error while fetching data", error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="guest-container">
      <main className="guest-main">
        <div className="guest-header">
          <h1>RSVP</h1>
          <p>Please indicate your attendance for each guest</p>
        </div>

        <div className="guest-card">
          {guests.map((guest) => (
            <div key={guest._id} className="guest-item">
              <div className="guest-info">
                <span className="guest-name">{guest.name}</span>
              </div>
              <div className="guest-buttons">
                <button
                  onClick={() => handleAttendingToggle(guest._id, true)}
                  className={`yes ${guest.attending === true ? "active" : ""}`}>
                  I will attend
                </button>
                <button
                  onClick={() => handleAttendingToggle(guest._id, false)}
                  className={`no ${guest.attending === false ? "active" : ""}`}>
                  I won't
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button className="submit-btn" onClick={() => handleSubmit()}>
            Submit Responses
          </button>
        </div>
      </main>
    </div>
  );
};

export default Guest;
