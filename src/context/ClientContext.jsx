import axios from "axios";
import { createContext, useContext, useEffect, useState } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";
const ENV_CLIENT_ID = process.env.REACT_APP_CLIENT_ID || null;

const ClientContext = createContext(null);

const SESSION_KEY_CLIENT_ID = "clientId";
const SESSION_KEY_CONFIG    = "clientConfig";

// Resolve clientId priority:
//   1. Admin session (sessionStorage, set after login)
//   2. ?client= URL param  (guest invitation links)
//   3. REACT_APP_CLIENT_ID env var (per-deployment default)
const resolveClientId = () => {
  const session = sessionStorage.getItem(SESSION_KEY_CLIENT_ID);
  if (session) return { id: session, isGuest: false };
  const urlParam = new URLSearchParams(window.location.search).get("client");
  if (urlParam) return { id: urlParam, isGuest: true };
  if (ENV_CLIENT_ID) return { id: ENV_CLIENT_ID, isGuest: true };
  return { id: null, isGuest: true };
};

const { id: initialId } = resolveClientId();
if (initialId) axios.defaults.headers.common["x-client-id"] = initialId;

// Interceptor ensures the header is always fresh on every request
axios.interceptors.request.use((config) => {
  const id = sessionStorage.getItem(SESSION_KEY_CLIENT_ID)
    || new URLSearchParams(window.location.search).get("client")
    || ENV_CLIENT_ID;
  if (id) config.headers["x-client-id"] = id;
  return config;
});

export const ClientProvider = ({ children }) => {
  const [clientId,     setClientId]     = useState(initialId);
  const [clientConfig, setClientConfig] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY_CONFIG)) || null; }
    catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Called by the Login page after a successful /api/auth/login response
  const login = (id, config) => {
    sessionStorage.setItem(SESSION_KEY_CLIENT_ID, id);
    sessionStorage.setItem(SESSION_KEY_CONFIG, JSON.stringify(config));
    axios.defaults.headers.common["x-client-id"] = id;
    setClientId(id);
    setClientConfig(config);
    setLoading(false);
  };

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY_CLIENT_ID);
    sessionStorage.removeItem(SESSION_KEY_CONFIG);
    delete axios.defaults.headers.common["x-client-id"];
    setClientId(null);
    setClientConfig(null);
  };

  // On mount: set axios header and fetch config from server
  useEffect(() => {
    if (!clientId) { setLoading(false); return; }
    axios.defaults.headers.common["x-client-id"] = clientId;
    axios.get(`${API_BASE}/api/config/${clientId}`)
      .then((res) => {
        setClientConfig(res.data);
        const { isGuest } = resolveClientId();
        if (!isGuest) sessionStorage.setItem(SESSION_KEY_CONFIG, JSON.stringify(res.data));
      })
      .catch(() => {/* keep cached config */})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ClientContext.Provider value={{ clientId, clientConfig, loading, login, logout }}>
      {children}
    </ClientContext.Provider>
  );
};

export const useClient = () => useContext(ClientContext);
