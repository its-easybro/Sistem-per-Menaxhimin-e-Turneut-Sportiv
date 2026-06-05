import { io } from "socket.io-client";
import { API_BASE_URL } from "./config/api";

// Shared Socket.IO client used by the frontend for real-time server updates.
const socket = io(API_BASE_URL, {
  // Send cookies/session data with the socket connection when the backend needs auth.
  withCredentials: true,
});

export default socket;
