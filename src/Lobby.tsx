import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from './socket'; // ✅ Use shared socket

const Lobby = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('');

  const navigate = useNavigate();

  const handleHostGame = () => {
    const room = roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!name) return;
    socket.emit('host', { name, room });
  };

  const handleJoinGame = () => {
    if (!name || !roomCode) return;
    socket.emit('join', { name, room: roomCode });
  };

  useEffect(() => {
    socket.on('room-update', (data) => {
      setStatus(data.message);
      setRoomCode(data.room);
      navigate(`/game/${data.room}`);
    });

    return () => {
      socket.off('room-update');
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Bid Euchre Lobby</h1>

        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Your Name</label>
          <input
            className="w-full px-4 py-2 border rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-1">Room Code</label>
          <input
            className="w-full px-4 py-2 border rounded-lg"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            onClick={handleHostGame}
          >
            Host Game
          </button>
          <button
            className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            onClick={handleJoinGame}
          >
            Join Game
          </button>
        </div>

        {status && <p className="text-center text-sm text-gray-600">{status}</p>}
      </div>
    </div>
  );
};

export default Lobby;
