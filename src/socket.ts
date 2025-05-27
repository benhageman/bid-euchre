// src/socket.ts
import { io } from 'socket.io-client';

export const socket = io('wss://bid-euchre.onrender.com', {
  autoConnect: true,
});
