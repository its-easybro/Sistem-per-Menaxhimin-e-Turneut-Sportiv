import axios from "axios";
import { API_BASE_URL } from "./api";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})
// Interceptor to handle 401 Unauthorized responses. If a 401 response is received, 
// it attempts to refresh the access token using the refresh token. If the refresh is successful, 
// it retries the original request with the new access token. If the refresh fails (e.g., if the refresh token is invalid or expired), 
// it redirects the user to the login page.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401){
            try{
                await api.post("/api/auth/refresh");

                return api(error.config);
            } catch {
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;