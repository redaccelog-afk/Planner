import type { PublicQuestion, RevealPayload } from "@trivora/shared";

const ANSWER_COLORS = ["bg-answer-triangle", "bg-answer-diamond", "bg-answer-circle", "bg-answer-square"];

export default function AnswerDistributionChart({
  question,
  reveal,
}: {
  question: PublicQuestion;
  reveal: RevealPayload;
}) {
  const maxCount = Math.max(1, ...reveal.distribution.map((d) => d.count));

  return (
    <div className="w-full max-w-2xl space-y-2">
      {question.choices.map((choice, i) => {
        const entry = reveal.distribution.find((d) => d.choiceId === choice.id);
        const count = entry?.count ?? 0;
        const isCorrect = reveal.correctChoiceIds.includes(choice.id);
        return (
          <div key={choice.id} className="flex items-center gap-3">
            <span className={`w-40 truncate text-sm ${isCorrect ? "font-bold text-green-300" : "text-white/70"}`}>
              {choice.text} {isCorrect ? "✓" : ""}
            </span>
            <div className="h-6 flex-1 overflow-hidden rounded bg-white/10">
              <div
                className={`h-full ${ANSWER_COLORS[i % ANSWER_COLORS.length]}`}
                style={{ width: `${(count / maxCount) * 100}%` }}
              />
            </div>
            <span className="w-8 text-right text-sm">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
