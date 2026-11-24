import type { ReferenceArticle } from "@/features/library/reference/schema";

const ITALIAN_FEN =
  "r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6";

export const middlegameArticles: ReferenceArticle[] = [
  {
    id: "middlegame-initiative",
    slug: "initiative-and-tempo",
    category: "middlegame",
    title: "Initiative and Tempo",
    summary:
      "The initiative is the ability to make threats the opponent must answer. Tempo is the move you gain while doing it.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "The initiative belongs to the player who forces the conversation. If every move you make carries a threat, the opponent has less freedom to improve. Tempo is the extra move you gain when the opponent must respond.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The side with more active pieces can usually seize the initiative first.",
      },
      { type: "heading", text: "Make threats that improve your position" },
      {
        type: "paragraph",
        text: "A useful threat does two things: it forces a response and it improves a piece or pawn structure. If the threat can be met easily and does not improve anything, it may only waste time.",
      },
      {
        type: "list",
        items: [
          "Prefer threats that develop or centralise a piece.",
          "Do not chase pawns with the queen.",
          "Keep the king safe before grabbing material.",
          "Know when to convert the initiative into a lasting advantage.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "The initiative is temporary. If you cannot convert it, prepare to consolidate.",
      },
      {
        type: "paragraph",
        text: "A common mistake is to keep making threats after the opponent has consolidated. At that point the initiative is gone, and the advanced pieces may become targets. Re-evaluate and switch to a structural plan.",
      },
    ],
    keyTakeaways: [
      "Initiative forces the opponent to respond.",
      "Threats should improve your position, not just gain time.",
      "Convert or release the initiative before it runs out.",
    ],
    related: [
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
      { type: "opening", id: "C50", label: "Italian Game" },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-king-safety",
    slug: "king-safety-in-the-middlegame",
    category: "middlegame",
    title: "King Safety in the Middlegame",
    summary:
      "King safety is not only about castling. It is about the pawn shield, defender count, and open lines.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A castled king is safer than a king in the centre, but castling is not the end of king safety. The pawn shield, the number of defenders, and the opponent's attacking pieces all matter.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "Both kings are castled, but the central tension still affects safety.",
      },
      { type: "heading", text: "Count attackers and defenders" },
      {
        type: "paragraph",
        text: "Before launching an attack, count the pieces that can reach the king zone. If the defender has more, the attack is premature. If the attacker has more, look for a sacrifice to open lines.",
      },
      {
        type: "list",
        items: [
          "Keep at least one defender near the king.",
          "Avoid moving the pawns in front of the king without reason.",
          "Trade the opponent's attacking bishop if it is strong.",
          "Make luft before the attack arrives, not after.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A king with no escape square is vulnerable even if the pawn shield looks intact.",
      },
      {
        type: "paragraph",
        text: "King safety also affects the endgame. A king that is active in the endgame is strong, but only after the queens are gone. Do not centralise the king while major pieces remain unless the position demands it.",
      },
    ],
    keyTakeaways: [
      "Castling is only the first step.",
      "Count attackers and defenders before attacking.",
      "Keep an escape square when the position is sharp.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "kingsideAttack",
        label: "Kingside attack puzzles",
      },
      {
        type: "puzzle-theme",
        id: "defensiveMove",
        label: "Defensive move puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-pawn-breaks",
    slug: "pawn-breaks-and-central-tension",
    category: "middlegame",
    title: "Pawn Breaks and Central Tension",
    summary:
      "Pawn breaks open lines and change the structure. Timing is everything.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "A pawn break is a pawn move that challenges the opponent's structure or opens a file. It is the main way to convert a space advantage into activity. A premature break can create weaknesses for the opponent to attack.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The central tension can be resolved by either side's pawn break.",
      },
      { type: "heading", text: "Prepare the break" },
      {
        type: "paragraph",
        text: "Before pushing the break, make sure the pieces behind it are ready. If the break opens a file, your rooks should be able to use it. If it creates a passed pawn, your king should be safe enough to support it.",
      },
      {
        type: "list",
        items: [
          "Improve the pieces that will use the open file.",
          "Do not break if your king is exposed.",
          "Choose the break that creates a second weakness.",
          "Be ready for the opponent's counter-break.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If the opponent can meet your break with a stronger break, keep the tension.",
      },
      {
        type: "paragraph",
        text: "Central tension is often a source of advantage. The side with more space usually benefits from keeping tension, while the side with less space wants to release it. Ask which side is comfortable with the tension before you resolve it.",
      },
    ],
    keyTakeaways: [
      "Pawn breaks convert space into activity.",
      "Prepare the pieces before opening the position.",
      "Keep tension when it favours your pieces.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-exchange",
    slug: "choosing-the-right-exchange",
    category: "middlegame",
    title: "Choosing the Right Exchange",
    summary:
      "Trades are decisions about the next position, not just the current one.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "In the middlegame, every exchange changes the attacking balance. Trading a defender can make an attack work. Trading an attacker can relieve pressure. The right exchange depends on the position, not on a fixed material count.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The side with the bishop pair usually wants to keep the position open.",
      },
      { type: "heading", text: "Ask who benefits from fewer pieces" },
      {
        type: "paragraph",
        text: "If you are attacking, you usually want more pieces. If you are defending, you want fewer. If you are worse in structure but better in activity, you may want to keep pieces on the board. The exchange should serve the side you are on.",
      },
      {
        type: "list",
        items: [
          "Do not trade your best attacker for a passive defender.",
          "Keep the bishop pair in open positions.",
          "Trade into an endgame only if your king and structure are better.",
          "Re-evaluate after the trade, not before.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A trade that solves one problem can create two new ones. Check the resulting structure.",
      },
      {
        type: "paragraph",
        text: "The most common mistake is trading because the position feels uncomfortable. Discomfort is not a plan. Find the piece that is causing the problem and improve it, or exchange it only if the resulting position is objectively better.",
      },
    ],
    keyTakeaways: [
      "Exchange decisions depend on the next position.",
      "Attackers usually want more pieces; defenders want fewer.",
      "Do not trade just to escape tension.",
    ],
    related: [
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-attack",
    slug: "attacking-a-castled-king",
    category: "middlegame",
    title: "Attacking a Castled King",
    summary:
      "A kingside attack needs open lines, more attackers than defenders, and a safe king behind the attack.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Attacking a castled king is not about throwing pieces forward. It is about creating a mismatch: more attackers than defenders, an open file, and a target such as a weak pawn or a pinned defender.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The attacker usually needs a pawn break or a piece sacrifice to open the king.",
      },
      { type: "heading", text: "Open the king before you invade" },
      {
        type: "paragraph",
        text: "A pawn storm is useful when the king has a fixed pawn shield. A piece sacrifice is useful when the shield can be removed. In both cases, the goal is to open a line for the queen or rook.",
      },
      {
        type: "list",
        items: [
          "Count attackers and defenders.",
          "Open a file or diagonal before the queen arrives.",
          "Keep your own king safe.",
          "Do not attack if the centre is unstable.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "If the opponent can open the centre while you attack the wing, your king may become the target.",
      },
      {
        type: "paragraph",
        text: "The attacker must also consider the endgame. If the attack fails, the advanced pawns may become weak. Before committing, ask whether you have a safe transition if the opponent defends accurately.",
      },
    ],
    keyTakeaways: [
      "Attacks need open lines and a numerical advantage.",
      "Keep your own king safe during the attack.",
      "Have a plan for the position after the attack fails.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "kingsideAttack",
        label: "Kingside attack puzzles",
      },
      { type: "puzzle-theme", id: "sacrifice", label: "Sacrifice puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-defence",
    slug: "defending-a-worse-position",
    category: "middlegame",
    title: "Defending a Worse Position",
    summary:
      "Defence is about reducing the opponent's options and creating counterplay, not only blocking threats.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "A worse position is not lost. The defender's job is to make the opponent's plan difficult, simplify where possible, and create a counter-threat that forces the opponent to slow down.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "A defender often needs to trade the opponent's strongest attacking piece.",
      },
      { type: "heading", text: "Find the opponent's best piece" },
      {
        type: "paragraph",
        text: "The strongest attacking piece is usually the one that coordinates the rest. Trade it, block it, or take away its squares. If you can remove that piece, the attack often loses energy.",
      },
      {
        type: "list",
        items: [
          "Trade the opponent's most active piece.",
          "Keep your king safe and your pieces coordinated.",
          "Create counterplay on the other wing.",
          "Do not weaken your structure without a concrete gain.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A defender who only reacts will eventually run out of resources. Find a move that makes the opponent think.",
      },
      {
        type: "paragraph",
        text: "Defending accurately often means accepting a small concession. Giving up a pawn to reach a drawn endgame can be the best practical decision. The goal is not to keep everything; it is to reach a position you can hold.",
      },
    ],
    keyTakeaways: [
      "Defence is active, not passive.",
      "Trade the opponent's strongest attacking piece.",
      "A small concession can be better than a lost position.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "defensiveMove",
        label: "Defensive move puzzles",
      },
      { type: "puzzle-theme", id: "equality", label: "Equality puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "middlegame-conversion",
    slug: "converting-an-advantage-without-risk",
    category: "middlegame",
    title: "Converting an Advantage Without Risk",
    summary:
      "When you are winning, the goal is to reduce counterplay and convert steadily.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "A winning position can be lost by trying to win too quickly. Conversion means improving your position, preventing counterplay, and choosing the simplest path to a winning endgame.",
      },
      {
        type: "diagram",
        fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
        caption:
          "In the endgame, king activity and pawn promotion decide the result.",
      },
      { type: "heading", text: "Reduce the opponent's activity" },
      {
        type: "paragraph",
        text: "The opponent's counterplay usually comes from one active piece or one pawn break. Take that away before you make a slow improving move. If you can trade into a simple winning endgame, do it.",
      },
      {
        type: "list",
        items: [
          "Keep your king safe.",
          "Trade the opponent's active pieces.",
          "Avoid unnecessary pawn moves.",
          "Use the simplest winning plan.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not allow a draw offer to distract you from the objective position. Calculate the simplest conversion.",
      },
      {
        type: "paragraph",
        text: "Conversion is a skill of restraint. If you have a winning position, you do not need a brilliant move. You need a move that keeps the advantage and gives the opponent nothing to play for.",
      },
    ],
    keyTakeaways: [
      "Reduce counterplay before making slow moves.",
      "Trade into a winning endgame when possible.",
      "The simplest conversion is usually the best one.",
    ],
    related: [
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
    ],
    schemaVersion: 1,
  },
];
