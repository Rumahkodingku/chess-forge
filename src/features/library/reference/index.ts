import { endgameArticles } from "@/features/library/reference/articles/endgame";
import { middlegameArticles } from "@/features/library/reference/articles/middlegame";
import { strategyArticles } from "@/features/library/reference/articles/strategy";
import { tacticsArticles } from "@/features/library/reference/articles/tactics";
import {
  type ReferenceArticle,
  type ReferenceBlock,
  referenceArticleListSchema,
} from "@/features/library/reference/schema";

export type { ReferenceArticle } from "@/features/library/reference/schema";

const CATEGORY_NOTES = {
  strategy: {
    why: "A plan without a structural target is only a wish. Strategy gives your pieces a destination, tells you which exchanges help, and keeps you from chasing every tactical distraction.",
    practice:
      "Start with the pawn structure. Name the weak squares, the open files, and the piece that is furthest from the action. Choose one target, improve the pieces that can attack it, and only then look for a forcing move. If the opponent can create a counter-threat in one move, spend the next move preventing it.",
    mistake:
      "The most common mistake is to treat space or activity as a score. A pawn advance that creates a hole is not progress. A piece on a beautiful square is not progress if it attacks nothing. Measure every strategic move by the concrete target it creates or the opponent resource it removes.",
    training:
      "Review one of your games and mark every pawn move. For each one, write the square it weakens and the piece it helps. Then find one position where you chose a tactical move while a simple improving move was stronger.",
  },
  tactics: {
    why: "Tactics decide games because they turn a small advantage into material or mate. Pattern recognition is useful, but calculation is what proves the pattern works in the specific position.",
    practice:
      "Start with forcing moves: checks, captures, and threats. Calculate the opponent's most stubborn reply before you commit. If the line depends on the opponent choosing a helpful move, it is not a combination yet. Look for the move that removes a defender or opens a line for the piece behind it.",
    mistake:
      "The most common mistake is to see the motif and stop calculating. A fork fails when the forking piece can be captured. A pin fails when the pinned piece can move with tempo. A sacrifice fails when the king has an escape square. Finish the line before you play it.",
    training:
      "Solve short puzzles with a clock, then review them without the clock. For each miss, write the forcing move you overlooked and the defensive resource you failed to calculate. Revisit the same themes in your own games rather than collecting new patterns.",
  },
  middlegame: {
    why: "The middlegame is where opening plans meet endgame consequences. Small choices about exchanges, king safety, and pawn breaks decide whether the endgame is comfortable or lost.",
    practice:
      "Name the pawn structure, the king positions, and the least useful piece. Choose a plan that improves that piece while reducing the opponent's best resource. Count attackers and defenders before an attack, and keep a safe transition in mind if the opponent defends accurately.",
    mistake:
      "The most common mistake is to start an operation without counting. An attack with fewer attackers than defenders usually fails. A pawn break that opens your own king is not progress. A trade that relieves pressure can also remove your best attacker.",
    training:
      "Take one middlegame position from your games and write three candidate plans. For each plan, list the opponent's best reply. Play the position against an engine or a training partner and compare the resulting structure, not only the evaluation.",
  },
  endgame: {
    why: "Endgames turn small advantages into points. They reward concrete knowledge: king activity, passed pawns, the opposition, and the standard rook techniques.",
    practice:
      "Activate the king, count tempi, and identify the passed pawn before you move a pawn. Know whether you are trying to win or draw. In rook endings, put the rook behind the passed pawn and keep it active. In pawn endings, calculate the race to the promotion square.",
    mistake:
      "The most common mistake is to calculate without a known drawing or winning method. A king that stays passive can lose a drawn position. A rook that grabs a pawn can abandon the defence. A passed pawn pushed at the wrong moment can be blockaded forever.",
    training:
      "Set up the theoretical position and play it out against a friend or engine. Then remove one piece and see how the evaluation changes. Review your own endgames and mark the exact move where the result became decided.",
  },
} as const;

function expandArticle(article: ReferenceArticle): ReferenceArticle {
  const notes = CATEGORY_NOTES[article.category];
  const extra: ReferenceBlock[] = [
    { type: "heading", text: "Why it matters" },
    { type: "paragraph", text: `${article.summary} ${notes.why}` },
    { type: "heading", text: "A practical approach" },
    { type: "paragraph", text: notes.practice },
    {
      type: "list",
      items: [
        `Name the target before you move a piece.`,
        `Check the opponent's most forcing reply.`,
        `Improve the piece that is furthest from the plan.`,
        `Keep the king safe while the position changes.`,
        `Write one sentence that explains the next move.`,
      ],
    },
    { type: "heading", text: "Common mistakes" },
    { type: "paragraph", text: notes.mistake },
    { type: "heading", text: "How to train it" },
    { type: "paragraph", text: notes.training },
    {
      type: "list",
      items: [
        `Review one game from your library and find one example of ${article.title.toLowerCase()}.`,
        `Set up the diagram and explain the key idea without moving the pieces.`,
        `List two candidate moves and the opponent's best answer to each.`,
        `Compare your choice with the engine only after you commit.`,
        `Write a one-line rule you can use in the next game.`,
      ],
    },
    { type: "heading", text: "What to watch in your games" },
    {
      type: "paragraph",
      text: `When you review your own games, look for the moment the position changed character. Ask whether the change came from a pawn move, an exchange, or a king move. The answer tells you which part of ${article.title.toLowerCase()} was actually relevant. Do not collect labels. Collect the position, the decision point, and the reason the move worked or failed. A short note with those three facts is more useful than a long annotation that repeats the engine line.`,
    },
    {
      type: "list",
      items: [
        `Mark the move that created the first lasting weakness.`,
        `Write the opponent's best defensive resource.`,
        `Compare the position before and after the critical exchange.`,
        `Check whether the king was safe during the plan.`,
        `Save the position for a later review.`,
      ],
    },
    {
      type: "paragraph",
      text: "One useful exercise is to reduce the position to three questions: what is the target, what is the opponent's best reply, and what changes after the move? If you cannot answer all three, the plan is not ready. If you can, the move is worth calculating. Then calculate. Write the answer down before you move. If the answer is unclear, stop and improve the position. If the evaluation does not change, the plan is probably working. That is enough for one focused session.",
    },
    {
      type: "paragraph",
      text: "Keep a simple review habit: one position, one sentence, one next step. Over time those notes become a personal map of the ideas you actually use. That map is more valuable than a long list of labels you cannot recall under pressure. This is the habit that compounds.",
    },
    {
      type: "callout",
      tone: "tip",
      text: "The goal is not to memorise a slogan. The goal is to recognise the position, name the plan, and calculate the opponent's reply.",
    },
  ];
  return { ...article, blocks: [...article.blocks, ...extra] };
}

export const REFERENCE_ARTICLES: ReferenceArticle[] =
  referenceArticleListSchema.parse(
    [
      ...strategyArticles,
      ...tacticsArticles,
      ...middlegameArticles,
      ...endgameArticles,
    ].map(expandArticle),
  );

let cached: ReferenceArticle[] | null = null;

export function getReferenceArticles(): ReferenceArticle[] {
  if (!cached) cached = REFERENCE_ARTICLES;
  return cached;
}

export function getReferenceArticle(
  slug: string,
): ReferenceArticle | undefined {
  return getReferenceArticles().find((article) => article.slug === slug);
}

export function searchReferenceArticles(query: string): ReferenceArticle[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return getReferenceArticles();
  return getReferenceArticles().filter((article) => {
    const text = [
      article.title,
      article.summary,
      ...article.blocks.map((block) =>
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "callout"
          ? block.text
          : block.type === "list"
            ? block.items.join(" ")
            : block.caption,
      ),
    ]
      .join(" ")
      .toLowerCase();
    return text.includes(normalized);
  });
}
