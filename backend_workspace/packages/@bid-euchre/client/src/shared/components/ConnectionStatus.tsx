/**
 * ConnectionStatus Component
 * 
 * Displays the current WebSocket connection status to the user.
 * Shows different states: connected, disconnected, reconnecting
 */

import React, { useState, useEffect } from 'react';
import { gameSocket } from '../../api/socket';

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

const ConnectionStatus: React.FC = () => {
  const [status, setStatus] = useState<ConnectionState>('connected');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show status when not connected
    const updateStatus = () => {
      if (gameSocket.isConnected()) {
        setStatus('connected');
        // Hide after 2 seconds when connected
        setTimeout(() => setIsVisible(false), 2000);
      } else {
        setStatus('disconnected');
        setIsVisible(true);
      }
    };

    // Check status periodically
    const interval = setInterval(updateStatus, 1000);
    updateStatus();

    return () => clearInterval(interval);
  }, []);

  if (!isVisible && status === 'connected') {
    return null;
  }

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg z-50 transition-all duration-300 ${
        status === 'connected'
          ? 'bg-green-600 text-white'
          : status === 'reconnecting'
          ? 'bg-yellow-600 text-white animate-pulse'
          : 'bg-red-600 text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        {status === 'connected' && (
          <>
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-semibold">Connected</span>
          </>
        )}
        {status === 'reconnecting' && (
          <>
            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            <span className="text-sm font-semibold">Reconnecting...</span>
          </>
        )}
        {status === 'disconnected' && (
          <>
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span className="text-sm font-semibold">Disconnected - Trying to reconnect</span>
          </>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
