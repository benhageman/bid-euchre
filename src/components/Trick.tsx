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

type Props = {
  trick: TrickCard[];
  players: Player[];
  youId?: string;
};

const Trick: React.FC<Props> = ({ trick, players, youId }) => {
  const playerIndex = youId ? players.findIndex((p) => p.id === youId) : 0;
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
    const play = trick.find((p) => p.id === playerId);
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
          {players.find((p) => p.id === play.id)?.name}
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
