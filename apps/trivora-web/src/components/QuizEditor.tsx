"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ChoiceForm = { id?: string; text: string; isCorrect: boolean };
type QuestionForm = {
  id?: string;
  type: "MCQ" | "TRUE_FALSE" | "POLL" | "PUZZLE";
  text: string;
  mediaUrl?: string | null;
  timeLimitSec: number;
  points: number;
  choices: ChoiceForm[];
};
type QuizForm = {
  title: string;
  description: string;
  category: string;
  visibility: "PRIVATE" | "PUBLIC";
  questions: QuestionForm[];
};

function emptyQuestion(type: QuestionForm["type"] = "MCQ"): QuestionForm {
  if (type === "TRUE_FALSE") {
    return {
      type,
      text: "",
      timeLimitSec: 10,
      points: 1000,
      choices: [
        { text: "Vrai", isCorrect: true },
        { text: "Faux", isCorrect: false },
      ],
    };
  }
  if (type === "POLL") {
    return {
      type,
      text: "",
      timeLimitSec: 15,
      points: 0,
      choices: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }],
    };
  }
  return {
    type,
    text: "",
    timeLimitSec: 20,
    points: 1000,
    choices: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

export default function QuizEditor({
  quizId,
  initial,
}: {
  quizId?: string;
  initial?: Partial<QuizForm>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<QuizForm>({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    visibility: initial?.visibility ?? "PRIVATE",
    questions: initial?.questions?.length ? initial.questions : [emptyQuestion()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(index: number, patch: Partial<QuestionForm>) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    }));
  }

  function updateChoice(qIndex: number, cIndex: number, patch: Partial<ChoiceForm>) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex
          ? { ...q, choices: q.choices.map((c, ci) => (ci === cIndex ? { ...c, ...patch } : c)) }
          : q
      ),
    }));
  }

  function setCorrectChoice(qIndex: number, cIndex: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex
          ? { ...q, choices: q.choices.map((c, ci) => ({ ...c, isCorrect: ci === cIndex })) }
          : q
      ),
    }));
  }

  function toggleCorrectChoice(qIndex: number, cIndex: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex
          ? { ...q, choices: q.choices.map((c, ci) => (ci === cIndex ? { ...c, isCorrect: !c.isCorrect } : c)) }
          : q
      ),
    }));
  }

  function addChoice(qIndex: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex && q.choices.length < 6 ? { ...q, choices: [...q.choices, { text: "", isCorrect: false }] } : q
      ),
    }));
  }

  function removeChoice(qIndex: number, cIndex: number) {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, i) =>
        i === qIndex && q.choices.length > 2 ? { ...q, choices: q.choices.filter((_, ci) => ci !== cIndex) } : q
      ),
    }));
  }

  function addQuestion() {
    setForm((f) => ({ ...f, questions: [...f.questions, emptyQuestion()] }));
  }

  function removeQuestion(index: number) {
    setForm((f) => ({ ...f, questions: f.questions.filter((_, i) => i !== index) }));
  }

  function changeType(index: number, type: QuestionForm["type"]) {
    updateQuestion(index, emptyQuestion(type));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      visibility: form.visibility,
      questions: form.questions.map((q) => ({
        type: q.type,
        text: q.text,
        timeLimitSec: q.timeLimitSec,
        points: q.points,
        choices: q.choices.map((c) => ({ text: c.text, isCorrect: c.isCorrect })),
      })),
    };

    const res = await fetch(quizId ? `/api/quizzes/${quizId}` : "/api/quizzes", {
      method: quizId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur lors de l'enregistrement");
      setSaving(false);
      return;
    }

    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-24">
      <div className="card space-y-3 p-6">
        <input
          className="input text-xl font-semibold"
          placeholder="Titre du quiz"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        />
        <textarea
          className="input"
          placeholder="Description (optionnel)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="flex gap-3">
          <input
            className="input"
            placeholder="Catégorie"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          />
          <select
            className="input"
            value={form.visibility}
            onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value as "PRIVATE" | "PUBLIC" }))}
          >
            <option value="PRIVATE">Privé</option>
            <option value="PUBLIC">Public (bibliothèque)</option>
          </select>
        </div>
      </div>

      {form.questions.map((q, qIndex) => (
        <div key={qIndex} className="card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60">Question {qIndex + 1}</span>
            <div className="flex items-center gap-2">
              <select
                className="input !w-auto"
                value={q.type}
                onChange={(e) => changeType(qIndex, e.target.value as QuestionForm["type"])}
              >
                <option value="MCQ">Choix multiple</option>
                <option value="TRUE_FALSE">Vrai / Faux</option>
                <option value="POLL">Sondage</option>
                <option value="PUZZLE">Puzzle (ordre)</option>
              </select>
              {form.questions.length > 1 && (
                <button onClick={() => removeQuestion(qIndex)} className="btn-secondary text-red-300">
                  Retirer
                </button>
              )}
            </div>
          </div>

          <input
            className="input"
            placeholder="Intitulé de la question"
            value={q.text}
            onChange={(e) => updateQuestion(qIndex, { text: e.target.value })}
          />

          <div className="flex gap-3">
            <label className="flex flex-1 items-center gap-2 text-sm text-white/70">
              Temps (s)
              <input
                className="input"
                type="number"
                min={5}
                max={120}
                value={q.timeLimitSec}
                onChange={(e) => updateQuestion(qIndex, { timeLimitSec: Number(e.target.value) })}
              />
            </label>
            {q.type !== "POLL" && (
              <label className="flex flex-1 items-center gap-2 text-sm text-white/70">
                Points
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={2000}
                  value={q.points}
                  onChange={(e) => updateQuestion(qIndex, { points: Number(e.target.value) })}
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            {q.choices.map((c, cIndex) => (
              <div key={cIndex} className="flex items-center gap-2">
                {q.type === "PUZZLE" ? (
                  <span className="w-6 text-center text-white/60">{cIndex + 1}</span>
                ) : q.type === "POLL" ? (
                  <span className="w-6" />
                ) : q.type === "TRUE_FALSE" ? (
                  <input
                    type="radio"
                    checked={c.isCorrect}
                    onChange={() => setCorrectChoice(qIndex, cIndex)}
                    className="h-5 w-5"
                  />
                ) : (
                  <input
                    type="checkbox"
                    checked={c.isCorrect}
                    onChange={() => toggleCorrectChoice(qIndex, cIndex)}
                    className="h-5 w-5"
                    title="Bonne réponse"
                  />
                )}
                <input
                  className="input"
                  placeholder={q.type === "PUZZLE" ? `Élément ${cIndex + 1} (dans l'ordre correct)` : `Réponse ${cIndex + 1}`}
                  value={c.text}
                  disabled={q.type === "TRUE_FALSE"}
                  onChange={(e) => updateChoice(qIndex, cIndex, { text: e.target.value })}
                />
                {q.type !== "TRUE_FALSE" && q.choices.length > 2 && (
                  <button onClick={() => removeChoice(qIndex, cIndex)} className="text-white/50 hover:text-red-300">
                    ✕
                  </button>
                )}
              </div>
            ))}
            {q.type !== "TRUE_FALSE" && q.choices.length < 6 && (
              <button onClick={() => addChoice(qIndex)} className="btn-secondary text-sm">
                + Ajouter une réponse
              </button>
            )}
          </div>
        </div>
      ))}

      <button onClick={addQuestion} className="btn-secondary w-full">
        + Ajouter une question
      </button>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#1e0a4a]/95 p-4">
        <div className="mx-auto flex max-w-3xl justify-end">
          <button onClick={handleSave} className="btn-primary" disabled={saving || !form.title}>
            {saving ? "Enregistrement..." : "Enregistrer le quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
