// src/components/Trick.tsx
import React from "react";
import { formatCard } from "../utils/formatCard";
import clsx from "clsx";

type TrickCard = {
  id: string;
  card: string;
};

type Player = {
  id: string;
  name: string;
};

type Bid = {
  name: string;
  amount: number | "moon";
  trump: string;
};

type Props = {
  trick: TrickCard[];
  players: Player[];
  bidding?: boolean;
  bids?: (Bid | null)[];
  youId?: string;
};

const trumpMap: Record<string, { emoji: string; color: string }> = {
  spades: { emoji: "♠️", color: "text-black" },
  hearts: { emoji: "♥️", color: "text-red-600" },
  diamonds: { emoji: "♦️", color: "text-red-600" },
  clubs: { emoji: "♣️", color: "text-black" },
  high: { emoji: "⬆️", color: "text-blue-500" },
  low: { emoji: "⬇️", color: "text-blue-500" },
};

const Trick: React.FC<Props> = ({ trick, players, bidding = false, bids = [], youId }) => {
  if (bidding) {
    return (
      <div className="w-full max-w-xs mx-auto bg-white text-black rounded-md p-3 shadow">
        <h3 className="text-center font-bold mb-2">Bids</h3>
        <ul className="space-y-1 text-sm">
          {players.map((player, index) => {
            const bid = bids[index];
            if (!bid || bid.amount === 0) {
              return (
                <li key={index} className="text-gray-400">
                  {player.name} passed
                </li>
              );
            }

            const { emoji, color } = trumpMap[bid.trump] || {};
            return (
              <li key={index} className="flex gap-2 items-center">
                <span className="font-semibold">{bid.name}:</span>
                <span className={clsx("font-mono", color)}>
                  {bid.amount === "moon" ? "🌙 Moon" : `${bid.amount} ${emoji}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const playerIndex = youId ? players.findIndex(p => p.id === youId) : 0;
  const rotated = [...players];
  if (playerIndex > 0) {
    const cut = rotated.splice(0, playerIndex);
    rotated.push(...cut);
  }

  const layout = {
    bottom: rotated[0]?.id,
    left: rotated[1]?.id,
    top: rotated[2]?.id,
    right: rotated[3]?.id,
  };

  const renderCard = (playerId: string | undefined) => {
    const play = trick.find(p => p.id === playerId);
    if (!play) return null;

    const { display, color } = formatCard(play.card);

    return (
      <div className="flex flex-col items-center">
        <div
          className={clsx(
            "aspect-[2/3] w-12 sm:w-14 rounded-lg border-2 shadow font-mono text-xs sm:text-sm font-bold flex items-center justify-center bg-white text-black",
            color
          )}
        >
          {display}
        </div>
        <div className="text-sm text-gray-300 mt-1">
          {players.find(p => p.id === play.id)?.name}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48">
      <div className="absolute left-1/2 top-0 transform -translate-x-1/2">
        {renderCard(layout.top)}
      </div>
      <div className="absolute left-0 top-1/2 transform -translate-y-1/2">
        {renderCard(layout.left)}
      </div>
      <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
        {renderCard(layout.right)}
      </div>
      <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2">
        {renderCard(layout.bottom)}
      </div>
    </div>
  );
};

export default Trick;
