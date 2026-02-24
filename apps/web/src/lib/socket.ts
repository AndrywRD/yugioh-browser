"use client";

import { io } from "socket.io-client";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:3333";

export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ["websocket"]
});
