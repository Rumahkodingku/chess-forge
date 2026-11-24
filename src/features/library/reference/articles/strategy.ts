import type { ReferenceArticle } from "@/features/library/reference/schema";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ITALIAN_FEN =
  "r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6";

export const strategyArticles: ReferenceArticle[] = [
  {
    id: "strategy-space",
    slug: "space-and-piece-activity",
    category: "strategy",
    title: "Space and Piece Activity",
    summary:
      "Space is useful only when pieces can use it. Learn how to convert territory into activity without overextending.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "Space means the number of squares your pieces control on the opponent's half of the board. Extra space gives your pieces more routes and makes it harder for the opponent to coordinate. It is not a score by itself. A large pawn centre with passive pieces can become a target.",
      },
      {
        type: "diagram",
        fen: START_FEN,
        caption:
          "The initial position. Every space advantage starts from a healthy structure.",
      },
      { type: "heading", text: "Turn space into routes" },
      {
        type: "paragraph",
        text: "Before pushing pawns, identify the squares those pawns will leave behind. A pawn advance should open a file, create an outpost, or take a square away from an enemy piece. If it does none of those things, improve a piece instead.",
      },
      {
        type: "list",
        items: [
          "Use pawns to claim squares, not to chase pieces.",
          "Place knights on outposts that enemy pawns cannot attack.",
          "Keep rooks connected and ready to use open files.",
          "Avoid pushing every pawn; every push leaves a square behind.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "If you have more space, avoid unnecessary exchanges. Trading pieces reduces the value of territory.",
      },
      {
        type: "paragraph",
        text: "A practical test: after your intended move, ask which piece improves next. If the answer is unclear, the move probably gains space without gaining activity. Space becomes an advantage when the opponent runs out of useful squares while your pieces keep improving.",
      },
    ],
    keyTakeaways: [
      "Space matters through the activity it creates.",
      "Do not push pawns without a concrete target or route.",
      "Keep enough pieces on the board to use the extra territory.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-pawn-structure",
    slug: "pawn-structure-as-a-long-term-asset",
    category: "strategy",
    title: "Pawn Structure as a Long-Term Asset",
    summary:
      "Pawns decide which squares are weak, which files open, and which endgames are favourable.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "Pawns cannot move backwards. Every pawn move changes the position permanently. That makes pawn structure a long-term asset or liability, even when the immediate tactics look equal.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "A typical Italian structure. The central tension shapes both plans.",
      },
      { type: "heading", text: "Ask what the structure wants" },
      {
        type: "paragraph",
        text: "A structure with a backward pawn suggests play against that pawn. A structure with a protected passed pawn suggests simplifying into an endgame. A structure with fixed pawns suggests manoeuvring behind the pawn chain.",
      },
      {
        type: "list",
        items: [
          "Identify pawn islands and weak squares.",
          "Prefer structures that give your pieces clear targets.",
          "Do not trade into a worse pawn ending without calculation.",
          "Treat every pawn push as a permanent decision.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A temporary initiative can disappear. A bad pawn structure usually stays.",
      },
      {
        type: "paragraph",
        text: "Before a capture, look past the next move. If the recapture leaves you with an isolated pawn, ask whether activity compensates. If not, keep the tension. Strong players often postpone a structural concession until the tactical moment is right.",
      },
    ],
    keyTakeaways: [
      "Pawn moves are permanent.",
      "Structure determines long-term targets and endgame value.",
      "Do not trade into a worse structure without compensation.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-weak-squares",
    slug: "weak-squares-and-outposts",
    category: "strategy",
    title: "Weak Squares and Outposts",
    summary:
      "A weak square is a square no pawn can defend. Learn how to occupy it with a piece and keep it there.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "A square is weak when it cannot be defended by a pawn. A knight on such a square is called an outpost because it cannot be kicked away by a pawn. Outposts are especially valuable in closed positions where the opponent has fewer ways to challenge the piece.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The d5 and f5 squares are classic targets in many e4/e5 structures.",
      },
      { type: "heading", text: "Create the square before you use it" },
      {
        type: "paragraph",
        text: "You often need to provoke a pawn move before the outpost appears. Trading the pawn that controls the square, or forcing it forward, can create the hole. Then bring the piece in and defend it with another piece, not with a pawn that may later move.",
      },
      {
        type: "list",
        items: [
          "Identify holes in the opponent's pawn chain.",
          "Trade the pawn that controls the hole.",
          "Occupying the square is not enough; support the piece.",
          "Use the outpost to launch a second front.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "A knight on an outpost is strongest when the opponent has no bishop to challenge it.",
      },
      {
        type: "paragraph",
        text: "Do not occupy a weak square just because it is weak. The piece must create a threat or support a pawn break. If the piece is passive there, the opponent may simply ignore it and continue with a stronger plan elsewhere.",
      },
    ],
    keyTakeaways: [
      "Weak squares cannot be defended by pawns.",
      "Create the hole before placing a piece.",
      "An outpost must serve a concrete plan.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "positional", label: "Positional puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-open-files",
    slug: "open-files-and-rook-activity",
    category: "strategy",
    title: "Open Files and Rook Activity",
    summary:
      "Rooks need files. Learn how to open one, seize it, and turn it into an invasion route.",
    readingMinutes: 5,
    difficulty: "beginner",
    blocks: [
      {
        type: "paragraph",
        text: "Rooks are long-range pieces, but they need open or half-open files to matter. A rook on a closed file is often worse than a well-placed knight. Creating a file and contesting it is a core middlegame skill.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The c-file and d-file are common battlegrounds in the Italian Game.",
      },
      { type: "heading", text: "Seize the file before you invade" },
      {
        type: "paragraph",
        text: "Doubling rooks on a file is useful only if the file leads somewhere. First remove or block the opponent's major pieces, then place a rook on the seventh rank or use the file to support a pawn break.",
      },
      {
        type: "list",
        items: [
          "Open a file with a pawn break when it is safe.",
          "Contest the file before the opponent doubles.",
          "Use the seventh rank to attack pawns and cut off the king.",
          "Do not trade rooks if the resulting minor-piece ending is worse.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A file is not an achievement by itself. Ask what the rook attacks once it reaches the end.",
      },
      {
        type: "paragraph",
        text: "If you cannot open a file, improve the rook along the third rank or transfer it to another sector. Rook activity is about finding a route, not only about occupying a file. The best rook is the one that creates a second weakness.",
      },
    ],
    keyTakeaways: [
      "Rooks need open lines to be effective.",
      "Contest a file before the opponent dominates it.",
      "A file matters only if it creates a concrete target.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      {
        type: "puzzle-theme",
        id: "rookEndgame",
        label: "Rook endgame puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-coordination",
    slug: "piece-coordination-and-harmony",
    category: "strategy",
    title: "Piece Coordination and Harmony",
    summary:
      "Strong positions are not collections of good pieces; they are pieces that support each other's plans.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Coordination means your pieces cover each other, control the same sector, and prepare the same break. A queen and knight can be deadly together; the same queen and knight can also get in each other's way. Harmony is about purpose.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "The Italian Game shows how bishop, knight, and rook can share the same central plan.",
      },
      { type: "heading", text: "One plan, several pieces" },
      {
        type: "paragraph",
        text: "Choose a target and ask which pieces can support it. If the plan is a kingside attack, the queen, bishop, and knight should point at the same squares. If the plan is a central break, the rooks should be ready to use the resulting file.",
      },
      {
        type: "list",
        items: [
          "Improve the piece that is furthest from the action.",
          "Avoid moving the same piece twice without a reason.",
          "Use pawn moves to connect pieces, not to separate them.",
          "Keep a defender at home when the king is vulnerable.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "When you do not know what to do, improve your worst-placed piece.",
      },
      {
        type: "paragraph",
        text: "Coordination also means defensive harmony. A queen chasing a pawn on the wing can leave the king undefended. Before starting an operation, check that the pieces left behind can handle the opponent's counterplay.",
      },
    ],
    keyTakeaways: [
      "Coordination is shared purpose, not just activity.",
      "Improve the least useful piece before starting a new plan.",
      "Defensive harmony matters as much as attacking harmony.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "advantage", label: "Advantage puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-exchange",
    slug: "the-art-of-the-exchange",
    category: "strategy",
    title: "The Art of the Exchange",
    summary:
      "Every trade changes the position. Learn when to exchange, when to keep tension, and what each piece is worth in context.",
    readingMinutes: 5,
    difficulty: "intermediate",
    blocks: [
      {
        type: "paragraph",
        text: "Material values are a starting point, not a decision rule. A bishop that is blocked by its own pawns may be worse than a knight with an outpost. A rook without a file may be less useful than a strong minor piece.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "An exchange that fixes the structure can be stronger than a temporary material gain.",
      },
      { type: "heading", text: "Exchange to improve your worst piece" },
      {
        type: "paragraph",
        text: "The best trades usually remove an opponent's active piece or give your remaining pieces better squares. Trading into an endgame is attractive when your king is safer or your pawn structure is healthier, not merely because fewer pieces feel simpler.",
      },
      {
        type: "list",
        items: [
          "Trade the opponent's strongest piece when you can.",
          "Keep the bishop pair when the position is open.",
          "Avoid trading into a losing pawn ending.",
          "Use an exchange to fix a weakness you can attack.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "Do not simplify only because you are tired. Simplification is a plan, not a break.",
      },
      {
        type: "paragraph",
        text: "After every exchange, recalculate the new targets. The pawn that was blocked may become passed. The file that was closed may open. The endgame that looked safe may become lost. The trade is not the end of the thought; it is the beginning of the next position.",
      },
    ],
    keyTakeaways: [
      "Material value depends on piece activity and structure.",
      "Trade to improve your remaining pieces.",
      "Re-evaluate the position after every exchange.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-prophylaxis",
    slug: "prophylaxis-stop-the-plan-before-it-starts",
    category: "strategy",
    title: "Prophylaxis: Stop the Plan Before It Starts",
    summary:
      "Sometimes the best move is the one that prevents the opponent's idea. Prophylaxis is active prevention, not passive defence.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "Prophylaxis means anticipating the opponent's plan and taking away its most dangerous resource. It is not the same as waiting. A prophylactic move improves your position while making the opponent's intended plan harder.",
      },
      {
        type: "diagram",
        fen: ITALIAN_FEN,
        caption:
          "A quiet king move or rook move can prevent a future break before it becomes dangerous.",
      },
      { type: "heading", text: "Ask what the opponent wants" },
      {
        type: "paragraph",
        text: "Before choosing your plan, identify the opponent's next three moves. If they want to play a pawn break, occupy the square or control the file that supports it. If they want to trade your defender, move that defender to a better square.",
      },
      {
        type: "list",
        items: [
          "Name the opponent's best plan in one sentence.",
          "Prevent the plan without weakening your own king.",
          "Improve a piece while preventing the break.",
          "Re-check prophylaxis after every pawn move.",
        ],
      },
      {
        type: "callout",
        tone: "tip",
        text: "Prophylaxis works best when it is also development. A move that stops the opponent and improves your piece is rarely wasted.",
      },
      {
        type: "paragraph",
        text: "Do not spend every move stopping threats. If you can create a faster threat, do that. Prophylaxis is a tool for positions where the opponent's plan is stronger than your immediate attack.",
      },
    ],
    keyTakeaways: [
      "Identify the opponent's plan before choosing yours.",
      "Prevent the plan while improving your position.",
      "Do not confuse prophylaxis with passive waiting.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      {
        type: "puzzle-theme",
        id: "defensiveMove",
        label: "Defensive move puzzles",
      },
    ],
    schemaVersion: 1,
  },
  {
    id: "strategy-convert-static",
    slug: "converting-a-static-advantage",
    category: "strategy",
    title: "Converting a Static Advantage",
    summary:
      "A fixed structural advantage needs patience, a second front, and careful exchanges.",
    readingMinutes: 5,
    difficulty: "advanced",
    blocks: [
      {
        type: "paragraph",
        text: "A static advantage is a lasting feature: a better pawn structure, a strong outpost, or a safer king. Converting it is not about forcing a tactic. It is about improving pieces until the opponent has no good move left.",
      },
      {
        type: "diagram",
        fen: "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1",
        caption:
          "Even a simple pawn ending shows the value of a fixed structural edge.",
      },
      { type: "heading", text: "Open a second front" },
      {
        type: "paragraph",
        text: "If the opponent can defend one weakness, create another. Use your space to transfer pieces to the other wing. The goal is to stretch the defence until a pawn break or a decisive invasion becomes possible.",
      },
      {
        type: "list",
        items: [
          "Do not rush the decisive break.",
          "Improve every piece before trading.",
          "Create a second weakness in the opposite sector.",
          "Trade into an endgame only when the structure favours you.",
        ],
      },
      {
        type: "callout",
        tone: "warning",
        text: "A static advantage can disappear if you allow counterplay. Keep the opponent's active pieces under control.",
      },
      {
        type: "paragraph",
        text: "Patience does not mean repetition. Each move should make progress: a piece reaches a better square, a pawn is fixed, or a resource is taken away. When the opponent is truly passive, the breakthrough usually appears on its own.",
      },
    ],
    keyTakeaways: [
      "Static advantages are converted through piece improvement.",
      "Create a second weakness when one target is defended.",
      "Avoid counterplay while preparing the breakthrough.",
    ],
    related: [
      { type: "opening", id: "C50", label: "Italian Game" },
      { type: "puzzle-theme", id: "endgame", label: "Endgame puzzles" },
    ],
    schemaVersion: 1,
  },
];
