import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Bootstrap the header immediately from whatever is already in sessionStorage
// (or the hardcoded fallback) so requests made before the useEffect fires are covered.
axios.defaults.headers.common["x-client-id"] =
  sessionStorage.getItem("clientId") || "justin-yara";

const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
  const [clientId,     setClientId]     = useState(null);
  const [clientConfig, setClientConfig] = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("client") || sessionStorage.getItem("clientId") || "justin-yara";

    sessionStorage.setItem("clientId", id);
    // Set globally so every axios call (in any file) gets the header automatically
    axios.defaults.headers.common["x-client-id"] = id;
    setClientId(id);

    axios.get(`${API_BASE}/api/config/${id}`)
      .then((res) => setClientConfig(res.data))
      .catch(() => {
        // fallback so the app still renders
        setClientConfig({ clientId: id, coupleName: id, accentColor: "#800020" });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <ClientContext.Provider value={{ clientId, clientConfig, loading }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => useContext(ClientContext);
