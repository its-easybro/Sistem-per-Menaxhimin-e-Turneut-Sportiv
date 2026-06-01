import axios from "axios";
import { API_BASE_URL } from "./api";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
})

let isRefreshing = false;
let failedQueue = [];

// Process the queue of failed requests
const processQueue = (error, token) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};
// Interceptor to handle 401 Unauthorized responses. If a 401 response is received, 
// it attempts to refresh the access token using the refresh token from the session identifier. If the refresh is successful, 
// it retries the original request with the new access token. If the refresh fails (e.g., if the refresh token is invalid or expired), 
// it redirects the user to the login page.
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;
        const requestUrl = originalRequest?.url || "";
        const isAuthEndpoint = requestUrl.includes("/api/auth/");

        // Rate limit error handling
        if (status === 429) {
            return Promise.reject(new Error(
                error.response?.data?.message || "Too many requests, please try again later."
            ));
        }

        // 401 Unauthorized error handling
        if (status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            // If a refresh is already in progress, add the original request to the failed queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(() => {
                    return api(originalRequest);
                }).catch((err) => {
                    return Promise.reject(err);
                })
            }

            // If the access token is expired, attempt to refresh it
            originalRequest._retry = true;
            isRefreshing = true;
            try{
                await api.post("/api/auth/refresh");
                processQueue(null);
                return api(originalRequest);
            } catch (err) {
                processQueue(err);
                window.location.href = "/login";
                return Promise.reject(err)
            } finally {
                // Set isRefreshing to false after the refresh attempt completes
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;