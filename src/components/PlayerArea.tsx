// src/components/PlayerArea.tsx
import React from "react";
import clsx from "clsx";

type Props = {
  name: string;
  tricks: number;
  isCurrentTurn: boolean;
  vertical?: boolean;
};

const PlayerArea: React.FC<Props> = ({ name, tricks, isCurrentTurn, vertical = false }) => {
  return (
    <div
      className={clsx(
        "flex items-center justify-center p-2 border rounded-lg bg-green-700 text-white shadow",
        vertical ? "flex-col space-y-1" : "flex-row space-x-2"
      )}
    >
      <div className={clsx("font-bold", isCurrentTurn && "text-yellow-300")}>{name}</div>
      <div className="text-sm text-gray-300">Tricks: {tricks}</div>
    </div>
  );
};


export default PlayerArea;
