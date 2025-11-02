import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { gameSocket } from '../../api/socket';
import { RootState } from '../../store';
import { setPlayers } from '../game/gameSlice';

const Lobby: React.FC = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [status, setStatus] = useState('');
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const players = useSelector((state: RootState) => state.game.players);

  // Clear players when entering lobby
  useEffect(() => {
    dispatch(setPlayers([]));
  }, [dispatch]);

  // Navigate when players list is populated
  useEffect(() => {
    console.log('useEffect triggered:', { pendingNavigation, playersLength: players.length, players });
    if (pendingNavigation && players.length > 0) {
      console.log('Navigating to game with players:', players);
      navigate(`/game/${pendingNavigation}`);
      setPendingNavigation(null);
    }
  }, [players, pendingNavigation, navigate]);

  const handleHostGame = () => {
    const room = roomCode || Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!name) return;
    console.log('Hosting game:', { name, room });
    gameSocket.hostGame(name, room);
    setPendingNavigation(room);
  };

  const handleJoinGame = () => {
    if (!name || !roomCode) return;
    console.log('Joining game:', { name, roomCode });
    gameSocket.joinGame(name, roomCode);
    setPendingNavigation(roomCode);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-800">
      <div className="bg-green-700 p-8 rounded-2xl shadow-xl max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center text-white">Bid Euchre Lobby</h1>

        <div className="mb-4">
          <label className="block text-white mb-1">Your Name</label>
          <input
            className="w-full px-4 py-2 border rounded-lg"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
          />
        </div>

        <div className="mb-4">
          <label className="block text-white mb-1">Room Code</label>
          <input
            className="w-full px-4 py-2 border rounded-lg"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="e.g. ABC123"
          />
        </div>

        <div className="flex gap-4 mb-4">
          <button
            className="w-1/2 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
            onClick={handleHostGame}
          >
            Host Game
          </button>
          <button
            className="w-1/2 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700"
            onClick={handleJoinGame}
          >
            Join Game
          </button>
        </div>

        {status && <p className="text-center text-sm text-yellow-200">{status}</p>}
      </div>
    </div>
  );
};

export default Lobby;