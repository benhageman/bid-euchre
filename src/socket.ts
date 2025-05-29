// src/socket.ts
import { io } from 'socket.io-client';

//export const socket = io('wss://bid-euchre.roomBids.com', {
// export const socket = io('http://localhost:3001', {
//   autoConnect: true,
// });
export const socket = io('wss://bid-euchre-4ehv.onrender.com', {
  autoConnect: true,
});
