import "./Envelope.css";
import { useNavigate } from "react-router-dom";

const Envelope = () => {
  const navigate = useNavigate();

  return (
    <div className="invitation">
      <h1 className="names">Anthony & Perla</h1>

      <button
        type="button"
        className="seal-container"
        onClick={() => navigate("/details")}
        aria-label="Open invitation">
        <img src="/stamp.png" alt="Wax seal" className="photo" />
      </button>

      <p className="click-to-open" onClick={() => navigate("/details")}>
        CLICK TO OPEN
      </p>
    </div>
  );
};

export default Envelope;
