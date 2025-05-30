// src/Game.tsx
import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import GameTable from "./components/GameTable";
import { SocketContext } from "./App"; // 👈 Import the shared context
import BidPanel from "./components/BidPanel";
import BidDisplay from "./components/BidDisplay";
import { TrumpType, BidAmount } from "./types/BidTypes";


type Player = {
  id: string;
  name: string;
};

type TrickCard = {
  id: string;
  card: string;
};

const Game: React.FC = () => {
  const { roomCode } = useParams();
  const { socket } = useContext(SocketContext); // 👈 Use shared socket
  const [players, setPlayers] = useState<Player[]>([]);
  const [hand, setHand] = useState<string[]>([]);
  const [trick, setTrick] = useState<TrickCard[]>([]);
  const [tricksWon, setTricksWon] = useState<{ [playerId: string]: number }>({});
  const [teamScores, setTeamScores] = useState<{ team1: number; team2: number }>({ team1: 0, team2: 0 });
  const [currentTurnId, setCurrentTurnId] = useState<string | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [isMyBidTurn, setIsMyBidTurn] = useState(false);
  const [isBidding, setIsBidding] = useState(false);
  const [dealer, setDealer] = useState<Player | null>(null);
  const [biddingActive, setBiddingActive] = useState(false);
  const [currentBidderId, setCurrentBidderId] = useState<string | null>(null);
  const [winningBid, setWinningBid] = useState<{ amount: BidAmount; trump: TrumpType; name: string } | null>(null);
  const [playedThisTrick, setPlayedThisTrick] = useState<Set<string>>(new Set());




  useEffect(() => {
    if (!socket || !roomCode) return;

    setMyId(socket.id ?? null); // 🔥 Immediately set it if already connected
    socket.on("connect", () => {
        setMyId(socket.id ?? null);
    });


    socket.emit("get-player-list", roomCode);

    const onPlayerList = (playerList: Player[]) => {
      setPlayers(playerList);
    };

    const onRoomUpdate = ({ room }: { room: string }) => {
      socket.emit("get-player-list", room);
    };

    const onDealHand = (cards: string[]) => {
      setHand(cards);
    };

    const onBiddingStarted = ({ dealer, bids }: { dealer: Player; bids: any[] }) => {
    setDealer(dealer);
    setBids(bids);
    setIsBidding(true);
    };

    socket.on("bidding-complete", ({ winner }) => {
        console.log("✅ Bidding complete:", winner);
        setIsBidding(false);      // stop showing the bid panel
        setWinningBid(winner);    // store winning bid to display
    });

    const onAutoPlayCard = ({ card }: { card: string }) => {
        // Remove from hand
        setHand((prev) => prev.filter((c) => c !== card));
    };


    const onTrickUpdated = (trickCards: TrickCard[]) => {
        setTrick(trickCards);

        // 👇 Remove played card from hand if it was mine
        const myPlay = trickCards.find((c) => c.id === myId);
        if (myPlay) {
            setHand((prev) => prev.filter((card) => card !== myPlay.card));
        }
        setPlayedThisTrick(new Set(trickCards.map(card => card.id)));
    };


    const onTrickComplete = ({ winnerId }: { winnerId: string }) => {
        // ✅ Update the trick count
        setTricksWon((prev) => ({
            ...prev,
            [winnerId]: (prev[winnerId] || 0) + 1,
        }));

        setTimeout(() => setPlayedThisTrick(new Set()), 500); // slight delay to clear
        // ✅ Clear the trick cards after a short delay (so user sees who won)
        setTimeout(() => {
            setTrick([]);
            setCurrentTurnId(winnerId); // Winner leads the next trick
        }, 1500); // 1.5 seconds is a nice delay
    };


    const onBidsUpdated = (updatedBids: any[]) => {
    setBids(updatedBids);
    };

    const onYourTurn = () => {
      setCurrentTurnId(socket.id ?? null);
    };

    const onScoreUpdate = (scores: { team1: number; team2: number }) => {
      setTeamScores(scores);
    };

    socket.on("player-list", onPlayerList);
    socket.on("room-update", onRoomUpdate);
    socket.on("deal-hand", onDealHand);
    socket.on("bidding-started", onBiddingStarted);
    socket.on("bids-updated", onBidsUpdated);
    socket.on("trick-updated", onTrickUpdated);
    socket.on("trick-complete", onTrickComplete);
    socket.on("your-turn-to-play", onYourTurn);
    socket.on("score-update", onScoreUpdate);
    socket.on("bidding-started", ({ dealer, bids }) => {
        console.log("🟡 Bidding started:", dealer);
        setDealer(dealer);
        setBids(bids);
        setWinningBid(null);      // ✅ clear previous winner
        setIsBidding(true);       // ✅ show bidding panel
        setIsMyBidTurn(false);
        });

    socket.on("your-turn-to-bid", () => {
        console.log("🟢 It's your turn to bid");
        setIsMyBidTurn(true);
    });
    socket.on("current-turn", (playerId: string) => {
        setCurrentTurnId(playerId);
    });
    socket.on("auto-play-card", onAutoPlayCard);




    return () => {
      socket.off("player-list", onPlayerList);
      socket.off("room-update", onRoomUpdate);
      socket.off("deal-hand", onDealHand);
      socket.off("trick-updated", onTrickUpdated);
      socket.off("trick-complete", onTrickComplete);
      socket.off("your-turn-to-play", onYourTurn);
      socket.off("score-update", onScoreUpdate);
      socket.off("bidding-started");
      socket.off("your-turn-to-bid");
      socket.off("bidding-started", onBiddingStarted);
      socket.off("bids-updated", onBidsUpdated);
      socket.off("current-turn");
      socket.off("auto-play-card", onAutoPlayCard);


    };
  }, [socket, roomCode]);

  const handlePlayCard = (card: string) => {
    if (socket) {
      socket.emit("play-card", { room: roomCode, card });
    }
  };

    return (
  <>
    {/* BidPanel only when it's your turn during bidding */}
    {isBidding && isMyBidTurn && (
      <div className="flex justify-center bg-green-900 py-2 px-4 text-white">
        <BidPanel
            currentHighestBid={bids.find(b => b && b.amount !== 0) || null}
            onSubmitBid={(bid) => {
                socket?.emit("submit-bid", { room: roomCode, ...bid });
                setIsMyBidTurn(false);
            }}
            />

      </div>
    )}

    {/* Main Game UI */}
    <GameTable
      players={players}
      currentTurnId={currentTurnId || ""}
      teamScores={teamScores}
      tricksWon={tricksWon}
      trickCards={trick}
      hand={hand}
      onPlayCard={handlePlayCard}
      isMyTurn={currentTurnId === (socket?.id ?? "")}
      youId={myId || ""}
      playedThisTrick={playedThisTrick}
      bids={bids}
      winningBid={winningBid}
    />
  </>
);



};

export default Game;
