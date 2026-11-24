import type { ReferenceArticle } from "@/features/library/reference/schema";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ITALIAN_FEN =
  "r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6";

export const tacticsArticles: ReferenceArticle[] = [
  {
    id: "tactics-pins",
    slug: "pins-absolute-and-relative",
    category: "tactics",
    title: "Pins: Absolute and Relative",
    summary:
      "A pin freezes a piece because moving it would expose something more valuable.",
    readingMinutes: 4,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A pin happens when a line piece attacks a piece that cannot move without exposing a more valuable piece behind it. An absolute pin targets the king. A relative pin targets a queen, rook, or another important piece.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption: "Look for alignments between bishop, knight, and king.",
      },
      { type: "heading", text: "Attack the pinned piece" },
      {
        type: "paragraph",
        text: "The pinned piece is a poor defender. Add attackers until the opponent must either lose material or create a counter-threat. Do not assume the pin wins by itself; the opponent may break it with a check or a tactical resource.",
      },
      {
        type: "list",
        items: [
          "Find the line piece and the piece behind the target.",
          "Add attackers to the pinned piece.",
          "Check whether the opponent can break the pin.",
          "Use the pin to win a tempo, not only material.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A relative pin is not absolute. The pinned piece may move if the material concession is acceptable.",
      },
      {
        type: "paragraph",
        text: "Pins are strongest when the pinned piece is also a key defender. Removing it from the defence can make a mating attack or a pawn breakthrough work. Look for pins that support another tactic rather than trying to win the piece immediately.",
      },
    ],
    keyTakeaways: [
      "Absolute pins target the king; relative pins target value.",
      "Attack a pinned piece with more pieces.",
      "Always check for a pin-breaking resource.",
    ],
    related: [
      { type: "puzzle-theme", id: "pin", label: "Pin puzzles" },
      { type: "opening", id: "C50", label: "Italian Game" },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-forks",
    slug: "forks-and-double-attacks",
    category: "tactics",
    title: "Forks and Double Attacks",
    summary:
      "One move, two targets. Forks are the most common way to win material.",
    readingMinutes: 4,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A fork attacks two or more targets at once. Knights are famous for forks because their attack pattern is hard to see. Queens, pawns, and bishops can also fork. The key is that the opponent cannot save every target with one move.",
      },
      {
        type: "diagram",
        fen: START_FEN,
        caption:
          "Knights are especially dangerous on squares that touch several key pieces.",
      },
      { type: "heading", text: "Create the fork square" },
      {
        type: "paragraph",
        text: "Forks rarely appear by accident. You often need to lure the king, queen, or rook onto a square where a knight can hit them together. Checks and captures are the best ways to force the opponent into the fork.",
      },
      {
        type: "list",
        items: [
          "Look for undefended pieces on knight-move distance.",
          "Use a check to force the king onto a fork square.",
          "A fork on the king and queen is usually decisive.",
          "Check whether the forking piece can be captured.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A fork is only a tactic if the forking piece survives. Count defenders before you commit.",
      },
      {
        type: "paragraph",
        text: "Double attacks are not limited to knights. A queen can attack two pieces on different lines; a pawn can fork two pieces; a bishop can attack a rook and a mating square. Train the pattern by asking which enemy pieces are loose.",
      },
    ],
    keyTakeaways: [
      "A fork attacks more than one target at once.",
      "Force the opponent onto the fork square with checks.",
      "Make sure the forking piece cannot be taken.",
    ],
    related: [
      { type: "puzzle-theme", id: "fork", label: "Fork puzzles" },
      {
        type: "puzzle-theme",
        id: "doubleAttack",
        label: "Double attack puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-skewers",
    slug: "skewers-and-line-clearance",
    category: "tactics",
    title: "Skewers and Line Clearance",
    summary:
      "A skewer attacks the more valuable piece first, forcing it to move and exposing what is behind.",
    readingMinutes: 4,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A skewer is the reverse of a pin. The line piece attacks a valuable piece, and when it moves, a less valuable piece behind it is exposed. Skewers often win material on open files and diagonals.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "Open lines make skewers possible. Look for king and queen on the same line.",
      },
      { type: "heading", text: "Force the front piece to move" },
      {
        type: "paragraph",
        text: "A check is the simplest skewer because the king must move. Then the line piece captures the piece behind it. Rooks and bishops are the usual skewering pieces; queens can skewer along any line.",
      },
      {
        type: "list",
        items: [
          "Find a valuable piece in front of another target.",
          "Use a check or attack to force it to move.",
          "Clear the line with a sacrifice if needed.",
          "Check that the back piece is actually undefended.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A skewer often starts with a check. Checks force the king to move without losing a tempo.",
      },
      {
        type: "paragraph",
        text: "Line clearance is related: a piece moves out of the way so a line piece can attack through it. The clearing move may be a sacrifice. The pattern is common in mating attacks and in winning a queen on an open file.",
      },
    ],
    keyTakeaways: [
      "A skewer attacks the valuable piece first.",
      "Checks are natural skewer starters.",
      "Line clearance can make the skewer possible.",
    ],
    related: [
      { type: "puzzle-theme", id: "skewer", label: "Skewer puzzles" },
      { type: "puzzle-theme", id: "clearance", label: "Clearance puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-discovered",
    slug: "discovered-attacks-and-discovered-checks",
    category: "tactics",
    title: "Discovered Attacks and Discovered Checks",
    summary:
      "Move one piece and reveal an attack from another. Discovered checks are among the strongest tactics.",
    readingMinutes: 4,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "A discovered attack happens when one piece moves and creates a line for another piece. The moving piece can create a second threat while the discovered piece attacks something else. A discovered check is especially strong because the opponent must answer the check and cannot also defend the second threat.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption: "Look for a piece blocking your bishop, rook, or queen.",
      },
      { type: "heading", text: "Make the moving piece count" },
      {
        type: "paragraph",
        text: "The best discovered attacks move a piece to a square where it creates a threat or captures something. If the moving piece does nothing, the tactic is weaker. Look for checks, captures, and attacks on the queen.",
      },
      {
        type: "list",
        items: [
          "Find the piece blocking your line piece.",
          "Move it with a threat of its own.",
          "Prefer discovered checks when available.",
          "Check that the opponent cannot block the discovered line.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Discovered attacks can backfire if the moving piece leaves your king exposed. Check your own king first.",
      },
      {
        type: "paragraph",
        text: "Double check is a special discovered check where both the moving piece and the revealed piece give check. The king must move, so double check is often the gateway to a mating attack.",
      },
    ],
    keyTakeaways: [
      "Discovered attacks reveal a line by moving a blocker.",
      "Discovered checks are stronger because the king must respond.",
      "Double check forces the king to move.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "discoveredAttack",
        label: "Discovered attack puzzles",
      },
      {
        type: "puzzle-theme",
        id: "discoveredCheck",
        label: "Discovered check puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-deflection",
    slug: "deflection-and-overloading",
    category: "tactics",
    title: "Deflection and Overloading",
    summary:
      "A defender can be forced away from its duty, or overloaded with more than it can handle.",
    readingMinutes: 4,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Deflection means forcing a defender to leave the square or line it protects. Overloading means giving a defender two jobs it cannot do at once. Both are about removing a specific defender rather than attacking the target directly.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "Find the defender of the key square, then look for a way to distract it.",
      },
      { type: "heading", text: "Find the one piece that holds the position" },
      {
        type: "paragraph",
        text: "Ask which piece prevents the mate or the capture. Then look for a check, capture, or threat against that piece. If the defender must respond, the original target becomes vulnerable.",
      },
      {
        type: "list",
        items: [
          "Identify the defender of the mating square or piece.",
          "Attack the defender with tempo.",
          "Use a sacrifice to drag it away.",
          "Check whether the defender has another job.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A queen is easy to overload because it is often the only defender of several squares.",
      },
      {
        type: "paragraph",
        text: "Deflection is not always about material. A defender may be forced away from a key file, allowing a rook to invade, or from a diagonal, allowing a bishop to deliver mate. The target is the duty, not the piece.",
      },
    ],
    keyTakeaways: [
      "Deflection removes a defender from its duty.",
      "Overloading gives a defender two impossible jobs.",
      "Identify the key defender before looking for the combination.",
    ],
    related: [
      { type: "puzzle-theme", id: "deflection", label: "Deflection puzzles" },
      { type: "puzzle-theme", id: "attraction", label: "Attraction puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-back-rank",
    slug: "back-rank-weakness",
    category: "tactics",
    title: "Back-Rank Weakness",
    summary:
      "A castled king can be mated by a rook or queen that reaches the back rank.",
    readingMinutes: 4,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "A back-rank weakness appears when the king is trapped behind its own pawns. A rook or queen that reaches the back rank can deliver mate if the king has no escape square. The weakness is common in positions where a player has not made luft.",
      },
      {
        type: "diagram",
        fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        caption: "The back rank is a mating lane when the king has no escape.",
      },
      { type: "heading", text: "Create the escape square or prevent it" },
      {
        type: "paragraph",
        text: "If you are defending, make luft when there is time. If you are attacking, keep the back rank closed and deflect the defenders. A rook on the seventh rank can also cut off the king's escape.",
      },
      {
        type: "list",
        items: [
          "Check whether your king has an escape square.",
          "Do not create luft if it weakens the king too much.",
          "Use a rook or queen to invade the back rank.",
          "Deflect the defender of the back rank.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Back-rank mate often appears after a queen sacrifice or a deflection. Check every forcing move.",
      },
      {
        type: "paragraph",
        text: "A back-rank weakness is not only a mating threat. It can also win material because the opponent's pieces are tied to the defence of the king. Use the threat to gain a tempo elsewhere.",
      },
    ],
    keyTakeaways: [
      "A trapped king is vulnerable to back-rank mate.",
      "Make luft only when it is safe.",
      "Deflect the defenders of the back rank.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "backRankMate",
        label: "Back-rank mate puzzles",
      },
      { type: "puzzle-theme", id: "mateIn2", label: "Mate in two puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-remove-defender",
    slug: "removing-the-defender",
    category: "tactics",
    title: "Removing the Defender",
    summary: "Before you attack a target, remove the piece that defends it.",
    readingMinutes: 4,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Many combinations fail because one defender holds the position together. Removing the defender means capturing it, forcing it away, or blocking its line. The target then falls or the mate appears.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption: "Count the defenders of the key square before attacking.",
      },
      { type: "heading", text: "Attack the defender with tempo" },
      {
        type: "paragraph",
        text: "The best removal is forcing. A check on the defender, a capture that threatens mate, or an attack on the queen can make the defender move. Then the original combination works.",
      },
      {
        type: "list",
        items: [
          "Identify every defender of the target.",
          "Find a forcing move against the defender.",
          "Use a sacrifice if it removes the key defender.",
          "Check the order: sometimes the defender must go first.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If a combination almost works, look for the one defender you have not removed.",
      },
      {
        type: "paragraph",
        text: "Removing the defender is a pattern, not a single tactic. It can be a capture, a deflection, a pin, or a block. The question is always the same: which piece is doing the defensive work, and how can I make it stop?",
      },
    ],
    keyTakeaways: [
      "Find the key defender before starting the attack.",
      "Force the defender away with a threat.",
      "Order matters: remove the defender first.",
    ],
    related: [
      {
        type: "puzzle-theme",
        id: "capturingDefender",
        label: "Capture the defender puzzles",
      },
      { type: "puzzle-theme", id: "fork", label: "Fork puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "tactics-sacrifice",
    slug: "sacrifices-for-initiative-and-mate",
    category: "tactics",
    title: "Sacrifices for Initiative and Mate",
    summary:
      "Material is a means, not the goal. A sacrifice is correct when the resulting attack is stronger than the material.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "A sacrifice gives up material for time, king safety, or a forced sequence. It is not a guess. The attacker must see a concrete follow-up: a mating net, a winning endgame, or a permanent initiative that prevents the opponent from consolidating.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption: "A sacrifice often opens a line or removes a key defender.",
      },
      { type: "heading", text: "Calculate the forcing line first" },
      {
        type: "paragraph",
        text: "Start with checks, captures, and threats. If the sacrifice does not force the opponent's reply, it is probably not a sacrifice but a gamble. The best sacrifices leave the defender with several legal moves that all lose.",
      },
      {
        type: "list",
        items: [
          "See the forcing continuation before you sac.",
          "Count the attacker's pieces in the attack.",
          "Check whether the opponent can give counter-check.",
          "Do not sac if the resulting position is merely unclear.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A sacrifice that only creates hope is not a combination. Calculate to a stable evaluation.",
      },
      {
        type: "paragraph",
        text: "Positional sacrifices are different. You may give a pawn for a strong outpost, the bishop pair, or a permanent weakness. In those cases, the compensation is structural rather than forcing. Both kinds require evidence, not optimism.",
      },
    ],
    keyTakeaways: [
      "Sacrifices need a concrete follow-up.",
      "Force the opponent's reply before committing.",
      "Positional compensation must be concrete too.",
    ],
    related: [
      { type: "puzzle-theme", id: "sacrifice", label: "Sacrifice puzzles" },
      {
        type: "puzzle-theme",
        id: "attackingF2F7",
        label: "Attack on f2/f7 puzzles",
      },
    ],
    schemaVersion: 1,
  },
];
