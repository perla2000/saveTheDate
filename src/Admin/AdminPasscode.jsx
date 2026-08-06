import axios from "axios";
import { useState } from "react";
import { API_ENDPOINTS, clientHeaders } from "../config/api";

const AdminPasscode = ({ onSuccess, clientConfig }) => {
  const [passcode,  setPasscode]  = useState("");
  const [error,     setError]     = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const coupleName = clientConfig?.coupleName || "Wedding";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) { setError("Please enter a passcode"); return; }

    setIsLoading(true);
    setError("");

    try {
      await axios.post(
        API_ENDPOINTS.VERIFY_PASSCODE(),
        { passcode: passcode.trim() },
        { headers: clientHeaders() }
      );
      sessionStorage.setItem("adminAuthenticated", "true");
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Invalid passcode");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-passcode">
      <div className="admin-passcode-card">
        <h1>Admin Access</h1>
        <p>{coupleName}'s Wedding Portal</p>

        <form onSubmit={handleSubmit} className="admin-passcode-form">
          <div className="input-group">
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              placeholder="Enter admin passcode"
              className="admin-input"
              disabled={isLoading}
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          <button
            type="submit"
            className="admin-btn admin-btn-primary"
            disabled={isLoading}>
            {isLoading ? "Validating..." : "Access Admin"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminPasscode;
