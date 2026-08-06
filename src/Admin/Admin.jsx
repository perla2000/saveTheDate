import { useState } from "react";
import AdminDashboard from "./AdminDashboard";
import AdminPasscode from "./AdminPasscode";
import { useClient } from "../context/ClientContext";
import "./Admin.css";

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { clientConfig, loading } = useClient();

  if (loading) {
    return (
      <div className="admin-container">
        <div className="admin-passcode-card" style={{ textAlign: "center", padding: "3rem" }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {!isAuthenticated ? (
        <AdminPasscode
          onSuccess={() => setIsAuthenticated(true)}
          clientConfig={clientConfig}
        />
      ) : (
        <AdminDashboard
          onLogout={() => setIsAuthenticated(false)}
          clientConfig={clientConfig}
        />
      )}
    </div>
  );
};

export default Admin;
