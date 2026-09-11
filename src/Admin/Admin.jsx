import AdminDashboard from "./AdminDashboard";
import { useClient } from "../context/ClientContext";
import "./Admin.css";

const Admin = () => {
  const { clientConfig, loading, logout } = useClient();

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
      <AdminDashboard
        onLogout={logout}
        clientConfig={clientConfig}
      />
    </div>
  );
};

export default Admin;
