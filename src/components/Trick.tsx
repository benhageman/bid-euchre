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
};

const Trick: React.FC<Props> = ({ trick, players }) => {
  const playerNameMap = Object.fromEntries(players.map((p) => [p.id, p.name]));

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-4">
      {trick.map((play, idx) => {
        const { display, color } = formatCard(play.card);
        return (
          <div key={idx} className="flex flex-col items-center">
            <div className={clsx("text-lg font-mono", color)}>{display}</div>
            <div className="text-sm text-gray-300">{playerNameMap[play.id]}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Trick;
