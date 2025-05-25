import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { socket } from './socket';

type Player = {
  id: string;
  name: string;
};

type Bid = {
    id: string;
    name: string;
    amount: number | 'moon';
    trump: string;
  };
  

type TrickPlay = {
  id: string;
  name: string;
  card: string;
};

const TRUMPS = ['high', 'low', 'hearts', 'diamonds', 'clubs', 'spades'];

const SUIT_SYMBOLS = {
  S: '♠',
  C: '♣',
  H: '♥',
  D: '♦',
};

const getSuitColor = (suit: string) => {
    return suit === 'H' || suit === 'D' ? '!text-red-500' : '!text-black';
  };  

  const formatCard = (card: string) => {
    const value = card.slice(0, -1);
    const suit = card.slice(-1).toUpperCase() as keyof typeof SUIT_SYMBOLS;
    return { display: `${value}${SUIT_SYMBOLS[suit]}`, colorClass: getSuitColor(suit) };
  };

  // Utility function: Trump strength ranking
  const trumpRank = (trump: string): number => {
    if (trump === 'low') return 1;
    if (['clubs', 'diamonds', 'hearts', 'spades'].includes(trump)) return 2;
    if (trump === 'high') return 3;
    return 0;
  };

  // Comparison logic for whether bid `b` is better than current best `a`
  const isBetterBid = (a: Bid | null, b: Bid): boolean => {
    if (b.amount === 'moon') return true;
    if (a?.amount === 'moon') return false;

    if (!a) return true;
    if (typeof b.amount === 'number' && typeof a.amount === 'number') {
      if (b.amount > a.amount) return true;
      if (b.amount < a.amount) return false;
      return trumpRank(b.trump) > trumpRank(a.trump);
    }

    return false;
  };

  

const GameTable = () => {
  const { roomCode } = useParams();
  const [players, setPlayers] = useState<Player[]>([]);
  const [hand, setHand] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [bidding, setBidding] = useState(false);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isMyTurnToBid, setIsMyTurnToBid] = useState(false);
  const [isMyTurnToPlay, setIsMyTurnToPlay] = useState(false);
  const [biddingWinner, setBiddingWinner] = useState<Bid | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number | 'moon'>(1);
  const [selectedTrump, setSelectedTrump] = useState<string>('high');
  const [trick, setTrick] = useState<TrickPlay[]>([]);
  const [trickCounts, setTrickCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string>('');
  const [moonPlayerId, setMoonPlayerId] = useState<string | null>(null);
  const [teamScores, setTeamScores] = useState<{ team1: number; team2: number }>({ team1: 0, team2: 0 });



  useEffect(() => {
    socket.on('player-list', (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on('auto-play-card', ({ room, card }) => {
      socket.emit('play-card', { room, card }, (response: { success: boolean }) => {
        if (response.success) {
          setHand((prev) => prev.filter((c) => c !== card));
          setIsMyTurnToPlay(false);
        }
      });
    });

    socket.on('score-update', (scores) => {
      setTeamScores(scores);
    });


    socket.on('deal-hand', (cards: string[]) => {
      setHand(cards);
    });

    socket.on('game-started', () => {
      setGameStarted(true);
    });

  socket.on('bidding-started', ({ bids }) => {
    setBidding(true);
    setBids(bids);
    setBiddingWinner(null);
    setTrickCounts({}); // 👈 Reset trick counter for all players
  });


    socket.on('bids-updated', (updatedBids: Bid[]) => {
      setBids(updatedBids);
    });

    socket.on('your-turn-to-bid', () => {
      setIsMyTurnToBid(true);
    });

    socket.on('bidding-complete', ({ winner, moonPlayerId }) => {
      setBidding(false);
      setIsMyTurnToBid(false);
      setBiddingWinner(winner);
      setMoonPlayerId(moonPlayerId || null); // Store the moon player ID (if any)
    });    

    socket.on('your-turn-to-play', () => {
        if (!moonPlayerId) {
          // If no Moon bidder, normal turn logic
          setIsMyTurnToPlay(true);
          return;
        }
      
        const myIndex = players.findIndex(p => p.id === socket.id); // My player index
        const moonIndex = players.findIndex(p => p.id === moonPlayerId); // Moon player's index
      
        if ((myIndex + 2) % 4 === moonIndex) {
          // I'm the teammate of the moon player (skip my turn)
          setIsMyTurnToPlay(false);
        } else {
          // It's my turn, I can play
          setIsMyTurnToPlay(true);
        }
      });      

    socket.on('trick-updated', (updatedTrick: TrickPlay[]) => {
      setTrick(updatedTrick);
    });

    socket.on('trick-complete', ({ winnerId }: { winnerId: string }) => {
        setTrick([]);
        setTrickCounts((prev) => ({
          ...prev,
          [winnerId]: (prev[winnerId] || 0) + 1,
        }));
      });
      
    socket.on('round-score', (scores: { team1: number; team2: number }) => {
      setTeamScores(prev => ({
        team1: prev.team1 + scores.team1,
        team2: prev.team2 + scores.team2,
      }));
    });

    socket.on('error-message', (msg: string) => {
      setError(msg);
    });

    if (roomCode) {
      socket.emit('get-player-list', roomCode);
    }

    return () => {
      socket.off('player-list');
      socket.off('deal-hand');
      socket.off('game-started');
      socket.off('bidding-started');
      socket.off('bids-updated');
      socket.off('your-turn-to-bid');
      socket.off('bidding-complete');
      socket.off('your-turn-to-play');
      socket.off('trick-updated');
      socket.off('trick-complete');
      socket.off('error-message');
      socket.off('round-score');
      socket.off('score-update');
    };
  }, [roomCode, moonPlayerId, players]);

  const handleStartGame = () => {
    socket.emit('start-game', roomCode);
  };

  const handleSubmitBid = () => {
    socket.emit('submit-bid', {
      room: roomCode,
      amount: selectedAmount,
      trump: selectedTrump
    });
    setIsMyTurnToBid(false);
    setError('');
  };

  const handlePass = () => {
    socket.emit('submit-bid', {
      room: roomCode,
      amount: 0,
      trump: 'pass'
    });
    setIsMyTurnToBid(false);
    setError('');
  };

  const handlePlayCard = (card: string) => {
    socket.emit('play-card', { room: roomCode, card }, (response: { success: boolean }) => {
      if (response.success) {
        setHand((prev) => prev.filter((c) => c !== card)); // ✅ Remove only on success
        setIsMyTurnToPlay(false);
      }
    });
  };
  
  

  const currentHighBid = bids.reduce<Bid | null>(
    (best, bid) => (isBetterBid(best, bid) ? bid : best),
    null
  );

  const canBid = isBetterBid(currentHighBid, {
    id: socket.id ?? '',
    name: 'You',
    amount: selectedAmount,
    trump: selectedTrump
  });

  const isHost = socket.id === players[0]?.id;

  const getTeam = (index: number) => {
    return index % 2 === 0 ? 'Team 1' : 'Team 2';
  };

  return (
    <div className="min-h-screen bg-green-700 flex flex-col items-center justify-start px-4 py-8 text-white">
      <h1 className="text-3xl font-bold mb-4">Game Room: {roomCode}</h1>
      <div className="mb-4 text-white text-xl font-semibold">
        Team 1: {teamScores.team1} — Team 2: {teamScores.team2}
      </div>
      <div className="grid grid-cols-2 gap-6 w-full max-w-3xl mb-6">
        {[0, 1, 2, 3].map((i) => (
            <div
            key={i}
            className="bg-white text-black text-center rounded p-4 shadow-lg h-24 flex flex-col items-center justify-center"
            >
            <span className="font-bold">
                {players[i]?.name || `Player ${i + 1}`}
            </span>
            <span className="text-xs text-gray-500">{getTeam(i)}</span>
            {bids[i] && (
                <span className="text-sm mt-1">
                    {bids[i].amount === 'moon'
                    ? `Moon! ${bids[i].trump}`
                    : bids[i].amount > 0
                    ? `Bid: ${bids[i].amount} ${bids[i].trump}`
                    : `Passed`}
                </span>
            )}

            {players[i] && (
                <span className="text-sm text-blue-600">
                Tricks: {trickCounts[players[i].id] || 0}
                </span>
            )}
            </div>
        ))}
        </div>


      {!gameStarted && isHost && players.length === 4 && (
        <button
          className="mb-6 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleStartGame}
        >
          Deal
        </button>
      )}

      {gameStarted && (
        <div className="bg-white rounded shadow-lg p-4 w-full max-w-2xl mb-6">
          <h2 className="text-xl font-semibold mb-2 text-black">Your Hand</h2>
          <div className="flex flex-wrap gap-2">
            {hand.map((card) => {
              const { display, colorClass } = formatCard(card);
              return (
                <div key={card} className="flex flex-col items-center">
                  <div className={`border rounded px-3 py-2 bg-gray-100 text-sm font-mono shadow-sm ${colorClass}`}>
                    {display}
                  </div>
                  {isMyTurnToPlay && (
                    <button
                      onClick={() => handlePlayCard(card)}
                      className="mt-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Play
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {trick.length > 0 && (
        <div className="bg-black bg-opacity-50 text-white p-4 rounded-lg mb-4">
          <h2 className="text-lg font-semibold mb-2">Current Trick</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            {trick.map((play, index) => {
              const { display, colorClass } = formatCard(play.card);
              return (
                <div key={index} className="text-center">
                  <p className="text-sm">{play.name}</p>
                  <div className={`text-xl font-mono px-4 py-2 rounded shadow bg-white ${colorClass}`}>
                    {display}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {bidding && (
        <div className="bg-white text-black rounded shadow-lg p-4 w-full max-w-2xl mb-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Bidding Phase</h2>

          {currentHighBid && currentHighBid.amount > 0 && (
            <p className="mb-2 text-sm">
              Current High Bid: <strong>{currentHighBid.amount} {currentHighBid.trump}</strong> by{' '}
              <strong>{currentHighBid.name}</strong>
            </p>
          )}

          {isMyTurnToBid ? (
            <>
              <div className="flex gap-4 justify-center mb-4">
                <select
                value={selectedAmount}
                onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAmount(val === 'moon' ? 'moon' : Number(val));
                }}
                className="px-2 py-1 border rounded"
                >
                {[1, 2, 3, 4, 5, 6].map((num) => (
                    <option key={num} value={num}>
                    {num}
                    </option>
                ))}
                <option value="moon">Moon</option>
                </select>

                <select
                  value={selectedTrump}
                  onChange={(e) => setSelectedTrump(e.target.value)}
                  className="px-2 py-1 border rounded"
                >
                  {TRUMPS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleSubmitBid}
                  disabled={!canBid}
                  className={`px-6 py-2 rounded ${
                    canBid
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  Submit Bid
                </button>

                <button
                  onClick={handlePass}
                  className="px-6 py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
                >
                  Pass
                </button>
              </div>

              {error && <p className="text-red-600 mt-2 text-sm">{error}</p>}
            </>
          ) : (
            <p>Waiting for others to bid...</p>
          )}
        </div>
      )}

      {biddingWinner && (
        <div className="bg-black bg-opacity-40 text-white px-6 py-4 rounded-lg">
          <p>
            <strong>{biddingWinner.name}</strong> won the bid with{' '}
            <strong>{biddingWinner.amount} {biddingWinner.trump}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default GameTable;
