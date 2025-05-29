// src/App.tsx
import React, { createContext, useEffect, useMemo, useState } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Lobby from './Lobby';
import Game from './Game';

// Define a type for context
type SocketContextType = {
  socket: Socket | null;
};

// Create context with default value
export const SocketContext = createContext<SocketContextType>({ socket: null });

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);

  // Setup socket connection once on mount
  useEffect(() => {
    //const newSocket = io('http://localhost:3001'); // Change if using remote server
    const newSocket = io('wss://bid-euchre-4ehv.onrender.com');
    setSocket(newSocket);
    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ✅ Set --app-height to avoid mobile scroll bugs
  useEffect(() => {
    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
    };

    setAppHeight();
    window.addEventListener('resize', setAppHeight);
    window.addEventListener('orientationchange', setAppHeight);

    return () => {
      window.removeEventListener('resize', setAppHeight);
      window.removeEventListener('orientationchange', setAppHeight);
    };
  }, []);

  // Memoize context value to avoid unnecessary re-renders
  const contextValue = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={contextValue}>
      <Router>
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:roomCode" element={<Game />} />
        </Routes>
      </Router>
    </SocketContext.Provider>
  );
}

export default App;
