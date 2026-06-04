import { io } from "socket.io-client";

const SOCKET_URL = "https://dtmyflix.onrender.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true
});