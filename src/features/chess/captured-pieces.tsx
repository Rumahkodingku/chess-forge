import type { PieceSymbol } from "chess.js";

const PIECE_NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

interface CapturedPiecesProps {
  pieces: PieceSymbol[];
  color: "w" | "b";
  owner: string;
}

export function CapturedPieces({ pieces, color, owner }: CapturedPiecesProps) {
  if (!pieces.length) return null;

  return (
    <span
      role="img"
      aria-label={`${owner} captured ${pieces
        .map((piece) => PIECE_NAMES[piece])
        .join(", ")}`}
      className="flex shrink-0 items-center gap-px"
    >
      {pieces.map((piece, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: captured pieces repeat, so index keeps duplicates distinct.
          key={`${piece}-${index}`}
          aria-hidden
          className="size-4 bg-contain bg-center bg-no-repeat drop-shadow-[0_1px_1px_rgba(0,0,0,0.45)]"
          style={{
            backgroundImage: `url(/pieces/cburnett/${color}${piece.toUpperCase()}.svg)`,
          }}
        />
      ))}
    </span>
  );
}
