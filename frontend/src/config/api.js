// Define the origin URL for the API backend.
const API_ORIGIN = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Export the base URL for general API requests.
export const API_BASE_URL = API_ORIGIN;
// Export the specific URL for authentication endpoints.
export const AUTH_API_URL = `${API_ORIGIN}/api/auth`;
