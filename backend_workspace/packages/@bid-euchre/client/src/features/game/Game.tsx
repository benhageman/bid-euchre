import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { gameSocket } from '../../api/socket';
import { RootState } from '../../store';
import { GameTable, BidPanel } from './components';
import type { TrumpType, BidAmount, Bid } from './types';

const Game: React.FC = () => {
  const { roomCode } = useParams();
  const dispatch = useDispatch();
  
  const {
    players,
    currentTurnId,
    hand,
    trick,
    tricksWon,
    teamScores,
    bids,
    winningBid,
    isBidding,
    playableCards
  } = useSelector((state: RootState) => state.game);

  // Ensure we're connected to the socket
  useEffect(() => {
    if (roomCode && gameSocket) {
      // If room isn't set in socket, we need to rejoin
      // This can happen on page refresh or direct navigation
      const currentRoom = gameSocket.getRoom();
      if (!currentRoom || currentRoom !== roomCode) {
        // We can't rejoin without a name, so just ensure socket is connected
        // The user should come through the lobby which calls joinGame
        gameSocket.connect();
      }
    }
  }, [roomCode]);

  const handlePlayCard = (card: string) => {
    if (gameSocket) {
      gameSocket.playCard(card);
    }
  };

  const handleSubmitBid = (bid: { amount: BidAmount; trump: TrumpType }) => {
    if (gameSocket) {
      gameSocket.submitBid(bid.amount, bid.trump);
    }
  };

  const handleAddBot = () => {
    gameSocket.addBot();
  };

  const isMyTurn = currentTurnId === gameSocket.getId();
  const myId = gameSocket.getId();
  const playedThisTrick = new Set(trick.map(t => t.id));

  return (
    <>
      {players.length < 4 && (
        <div className="fixed top-4 right-4 bg-green-700 px-4 py-3 rounded-lg shadow-lg z-10">
          <p className="text-white text-sm mb-2">
            Players: {players.length}/4
          </p>
          <button
            onClick={handleAddBot}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            Add Bot
          </button>
        </div>
      )}

      {isBidding && isMyTurn && (
        <div className="flex justify-center bg-green-900 py-2 px-4 text-white">
          <BidPanel
            currentHighestBid={bids.find(b => b && b.amount !== 0) || null}
            onSubmitBid={handleSubmitBid}
          />
        </div>
      )}

      <GameTable
        players={players}
        currentTurnId={currentTurnId || ""}
        teamScores={teamScores}
        tricksWon={tricksWon}
        trickCards={trick}
        hand={hand}
        onPlayCard={handlePlayCard}
        isMyTurn={isMyTurn}
        youId={myId}
        playedThisTrick={playedThisTrick}
        bids={bids.filter((bid): bid is Bid => bid !== null)}
        winningBid={winningBid}
        playableCards={playableCards}
        isBidding={isBidding}
      />
    </>
  );
};

export default Game;