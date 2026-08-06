const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

// Returns axios headers with the active clientId
export const clientHeaders = () => ({
  "x-client-id": sessionStorage.getItem("clientId") || "justin-yara",
});

export const API_ENDPOINTS = {
  // Config
  GET_CONFIG:  (clientId) => `${API_BASE_URL}/api/config/${clientId}`,
  LIST_CLIENTS: () => `${API_BASE_URL}/api/clients`,

  // Family endpoints
  FAMILY_BASE:      `${API_BASE_URL}/api`,
  GET_FAMILY:       (familyId) => `${API_BASE_URL}/api/family/${familyId}`,
  UPDATE_FAMILY:    (familyId) => `${API_BASE_URL}/api/family/update/${familyId}`,
  CREATE_FAMILY:    () => `${API_BASE_URL}/api/family`,
  DELETE_FAMILY:    (familyId) => `${API_BASE_URL}/api/family/delete/${familyId}`,
  GET_ALL_FAMILIES: () => `${API_BASE_URL}/api/family/all`,

  // Guest endpoints
  GET_GUESTS:      () => `${API_BASE_URL}/api/guests`,
  GET_GUEST_BY_ID: (guestId) => `${API_BASE_URL}/api/guestsById/${guestId}`,
  UPDATE_GUEST:    (guestId) => `${API_BASE_URL}/api/update/guest/${guestId}`,

  // Financials endpoints  (section = "cyprus" | "lebanon" | "gifts" | "tables" | "todos" | "vendors")
  GET_FIN:    (section)     => `${API_BASE_URL}/api/fin/${section}`,
  CREATE_FIN: (section)     => `${API_BASE_URL}/api/fin/${section}`,
  UPDATE_FIN: (section, id) => `${API_BASE_URL}/api/fin/${section}/${id}`,
  DELETE_FIN: (section, id) => `${API_BASE_URL}/api/fin/${section}/${id}`,

  // Admin
  VERIFY_PASSCODE:  () => `${API_BASE_URL}/api/admin/verify-passcode`,
  IMPORT_FAMILIES:  () => `${API_BASE_URL}/api/admin/import-families`,
};

export default API_BASE_URL;
