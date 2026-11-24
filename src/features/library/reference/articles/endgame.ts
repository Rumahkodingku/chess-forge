import type { ReferenceArticle } from "@/features/library/reference/schema";

const KING_ENDGAME = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
const ROOK_ENDGAME = "8/5pk1/8/8/8/8/5PK1/8 w - - 0 1";

export const endgameArticles: ReferenceArticle[] = [
  {
    id: "endgame-king-activity",
    slug: "king-activity-and-opposition",
    category: "endgame",
    title: "King Activity and Opposition",
    summary:
      "In the endgame, the king becomes a fighting piece. Learn how to activate it and use the opposition.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "Once the queens are gone, the king is no longer a liability. It is a piece that attacks pawns, supports passed pawns, and controls key squares. A passive king loses endgames that should be drawn or won.",
      },
      {
        type: "diagram",
        fen: KING_ENDGAME,
        caption: "The king belongs in front of the pawn, not behind it.",
      },
      { type: "heading", text: "Take the opposition" },
      {
        type: "paragraph",
        text: "The opposition happens when the kings face each other with one square between them and the side to move must give way. It is a key tool for promoting a pawn or stopping the opponent's king.",
      },
      {
        type: "list",
        items: [
          "Activate the king before pushing the pawn.",
          "Put the king in front of the passed pawn.",
          "Use the opposition to force the enemy king back.",
          "Do not chase pawns with the king if it leaves the promotion square.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If you have a passed pawn, the king usually belongs on the square in front of it.",
      },
      {
        type: "paragraph",
        text: "King activity is not only about the opposition. The king can also attack the opponent's pawns from the side, creating a second weakness. The key is to keep the king active without allowing the opponent's pawn to run.",
      },
    ],
    keyTakeaways: [
      "The king is a strong piece in the endgame.",
      "Take the opposition to force the enemy king back.",
      "Keep the king in front of the passed pawn.",
    ],
    related: [
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
      {
        type: "puzzle-theme",
        id: "pawnEndgame",
        label: "Pawn endgame puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-passed-pawn",
    slug: "passed-pawns-creation-and-promotion",
    category: "endgame",
    title: "Passed Pawns: Creation and Promotion",
    summary:
      "A passed pawn is a future queen. Learn how to create one, support it, and stop the opponent's.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A passed pawn has no enemy pawn in front of it on its file or the adjacent files. That makes it a candidate for promotion. Passed pawns become stronger as the board empties.",
      },
      {
        type: "diagram",
        fen: KING_ENDGAME,
        caption: "A passed pawn needs a king to escort it.",
      },
      { type: "heading", text: "Push with support" },
      {
        type: "paragraph",
        text: "Do not push a passed pawn alone. The king or a rook should support its advance. The pawn can also be used as a decoy to win material elsewhere.",
      },
      {
        type: "list",
        items: [
          "Create a passed pawn with a pawn break.",
          "Support it with the king or rook.",
          "Block the opponent's passed pawn with a piece that can hold it.",
          "Do not trade into a losing pawn race.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A passed pawn can be a weakness if it is blockaded and the opponent has a stronger passed pawn.",
      },
      {
        type: "paragraph",
        text: "In rook endings, the passed pawn is often the deciding factor. The rook belongs behind the passed pawn, whether yours or the opponent's. The king should support the pawn from the front.",
      },
    ],
    keyTakeaways: [
      "Passed pawns become stronger as pieces leave the board.",
      "Support the pawn with the king or rook.",
      "A blockaded pawn can become a weakness.",
    ],
    related: [
      { type: "puzzle-theme", id: "promotion", label: "Promotion puzzles" },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-rook",
    slug: "rook-endgames-activity-and-cutting-off",
    category: "endgame",
    title: "Rook Endgames: Activity and Cutting Off",
    summary:
      "Rook endings are common and drawish. Activity and the cut-off king decide many of them.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Rook endgames are the most common endgames in practice. The defender often draws with accurate play, but the attacker can win by activating the rook and cutting off the king.",
      },
      {
        type: "diagram",
        fen: ROOK_ENDGAME,
        caption: "The active rook is usually more important than a pawn.",
      },
      { type: "heading", text: "Rooks belong behind passed pawns" },
      {
        type: "paragraph",
        text: "Place your rook behind a passed pawn, whether it is yours or the opponent's. Behind your own pawn, the rook supports its advance. Behind the opponent's pawn, it attacks the pawn from the rear and keeps the king away.",
      },
      {
        type: "list",
        items: [
          "Activate the rook before grabbing a pawn.",
          "Cut off the enemy king with checks or a rook on the fourth rank.",
          "Place the rook behind passed pawns.",
          "Know the Lucena and Philidor positions.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A rook that is active can draw many positions that look lost. Do not trade it for a passive pawn.",
      },
      {
        type: "paragraph",
        text: "The defender should keep the rook active and check the king from behind. The attacker should advance the king and pawn together, avoiding stalemate and perpetual check. Small details decide the result.",
      },
    ],
    keyTakeaways: [
      "Rook activity matters more than small material gains.",
      "Put rooks behind passed pawns.",
      "Learn the Lucena and Philidor techniques.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "rookEndgame",
        label: "Rook endgame puzzles",
      },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-opposite-bishops",
    slug: "opposite-coloured-bishops",
    category: "endgame",
    title: "Opposite-Coloured Bishops",
    summary:
      "Opposite-coloured bishops can make a position difficult to convert, but they also create attacking chances.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "When each side has one bishop on a different colour, the position is often drawish. The defender can block squares the bishop cannot control. The attacker needs a second weakness or a passed pawn to make progress.",
      },
      {
        type: "diagram",
        fen: KING_ENDGAME,
        caption:
          "Even simple positions can be difficult when the bishop cannot control the key colour.",
      },
      { type: "heading", text: "Create a second weakness" },
      {
        type: "paragraph",
        text: "One weakness is rarely enough with opposite-coloured bishops. Use the bishop to attack a pawn on one wing while the king creates a threat on the other. The defender cannot cover both.",
      },
      {
        type: "list",
        items: [
          "Do not trade into opposite-coloured bishops if you need to win.",
          "Create a second weakness before pushing the pawn.",
          "Use the bishop to control the promotion square.",
          "Keep the king active on the stronger side.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A passed pawn on the wrong colour can be blockaded. The bishop may not be able to support it.",
      },
      {
        type: "paragraph",
        text: "In the middlegame, opposite-coloured bishops often favour the attacker because the defender's bishop cannot protect both wings. If you have the attack, keep pieces on the board and open lines for your bishop.",
      },
    ],
    keyTakeaways: [
      "Opposite-coloured bishops make conversion harder.",
      "Create a second weakness on the other wing.",
      "The bishop must be able to support the passed pawn.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "bishopEndgame",
        label: "Bishop endgame puzzles",
      },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-triangulation",
    slug: "triangulation-and-zugzwang",
    category: "endgame",
    title: "Triangulation and Zugzwang",
    summary:
      "Triangulation loses a tempo. Zugzwang forces the opponent to move into a worse position.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "Zugzwang means the side to move would prefer to pass. Triangulation is a king manoeuvre that loses a tempo, handing the move back to the opponent in a worse version of the position.",
      },
      {
        type: "diagram",
        fen: KING_ENDGAME,
        caption:
          "King manoeuvres can change who must move in the critical position.",
      },
      { type: "heading", text: "Use the king to lose a tempo" },
      {
        type: "paragraph",
        text: "A king can travel around a triangle of squares and return to the same square with the opposite side to move. This is useful in pawn endings where the opposition matters.",
      },
      {
        type: "list",
        items: [
          "Recognise the critical square.",
          "Count the moves needed to reach it.",
          "Use triangulation to lose a tempo.",
          "Do not move a pawn if it gives the opponent a draw.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "In endgames, a tempo can be worth more than a pawn. Look for ways to hand the move back.",
      },
      {
        type: "paragraph",
        text: "Zugzwang is also common in rook endings and minor-piece endings. The side that runs out of useful moves must weaken its position. The winning plan often consists of improving every piece and leaving the opponent with only bad moves.",
      },
    ],
    keyTakeaways: [
      "Zugzwang forces the opponent to move into a worse position.",
      "Triangulation loses a tempo with the king.",
      "Tempi decide many pawn endings.",
    ],
    related: [
      { type: "puzzle-theme", id: "zugzwang", label: "Zugzwang puzzles" },
      {
        type: "puzzle-theme",
        id: "pawnEndgame",
        label: "Pawn endgame puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-lucena",
    slug: "lucena-position",
    category: "endgame",
    title: "Lucena Position",
    summary:
      "The Lucena position is the basic winning technique for a rook and pawn against a rook.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "The Lucena position occurs when the stronger side has a rook and pawn against a rook, the pawn is on the seventh rank, and the king is near the promotion square. It is a theoretical win with the right technique.",
      },
      {
        type: "diagram",
        fen: "4k3/8/8/8/8/8/6PK/7R w - - 0 1",
        caption: "The key idea is to build a bridge for the king.",
      },
      { type: "heading", text: "Build a bridge" },
      {
        type: "paragraph",
        text: "The attacker uses the rook to protect the king from checks. The king steps out, the rook builds a bridge on the fourth rank, and the pawn promotes. The exact moves depend on the king positions.",
      },
      {
        type: "list",
        items: [
          "Put the king in front of the pawn.",
          "Use the rook to block checks.",
          "Build the bridge on the fourth rank.",
          "Avoid stalemate and unnecessary pawn moves.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "The Lucena position is winning only if the king is not cut off. Learn the exceptions.",
      },
      {
        type: "paragraph",
        text: "The Lucena technique is worth memorising because it appears in many practical games. The defender tries to keep checking and prevent the king from escaping. The attacker must find the precise moment to build the bridge.",
      },
    ],
    keyTakeaways: [
      "Lucena is the basic rook-and-pawn win.",
      "The rook builds a bridge for the king.",
      "The king must escape the checks.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "rookEndgame",
        label: "Rook endgame puzzles",
      },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "endgame-philidor",
    slug: "philidor-position",
    category: "endgame",
    title: "Philidor Position",
    summary:
      "The Philidor position is the basic drawing technique for rook and pawn against rook.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "The Philidor position is the defender's key drawing method against a rook and pawn. The defender keeps the rook on the third rank and waits for the pawn to advance before switching to checks from behind.",
      },
      {
        type: "diagram",
        fen: "8/8/8/8/8/5k2/5p2/5K1R w - - 0 1",
        caption: "The third-rank defence stops the king from advancing.",
      },
      { type: "heading", text: "Hold the third rank" },
      {
        type: "paragraph",
        text: "The defending rook controls the third rank, preventing the enemy king from stepping forward. When the pawn advances to the seventh rank, the rook goes behind it and starts checking.",
      },
      {
        type: "list",
        items: [
          "Keep the rook on the third rank.",
          "Do not allow the king to advance to the sixth rank.",
          "Switch to checks when the pawn reaches the seventh.",
          "Keep the king far enough from the pawn.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If you are defending a rook ending, try to reach the Philidor setup before the pawn reaches the seventh rank.",
      },
      {
        type: "paragraph",
        text: "The Philidor position is a draw because the defender can check the king forever or stop the pawn. The attacker must prevent the third-rank defence by cutting off the defending rook or advancing the pawn earlier.",
      },
    ],
    keyTakeaways: [
      "Philidor is the basic rook-and-pawn draw.",
      "Hold the third rank to stop the king.",
      "Switch to checks when the pawn reaches the seventh.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "rookEndgame",
        label: "Rook endgame puzzles",
      },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
];
