"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BACKGROUND_THEMES, MUSIC_THEMES, DEFAULT_BACKGROUND_THEME, DEFAULT_MUSIC_THEME } from "@trivora/shared";
import { musicPlayer } from "@/lib/musicPlayer";

type ChoiceForm = { id?: string; text: string; isCorrect: boolean };
type QuestionForm = {
  id?: string;
  type: "MCQ" | "TRUE_FALSE" | "POLL" | "PUZZLE";
  text: string;
  mediaUrl?: string | null;
  mediaType?: "IMAGE" | "VIDEO" | null;
  mediaDisplayMode: "BEFORE" | "WITH" | "FULLSCREEN";
  timeLimitSec: number;
  points: number;
  choices: ChoiceForm[];
};
type QuizForm = {
  title: string;
  description: string;
  category: string;
  visibility: "PRIVATE" | "PUBLIC";
  backgroundTheme: string;
  musicTheme: string;
  questions: QuestionForm[];
};

function emptyQuestion(type: QuestionForm["type"] = "MCQ"): QuestionForm {
  const base = { mediaUrl: null, mediaType: null, mediaDisplayMode: "WITH" as const };
  if (type === "TRUE_FALSE") {
    return {
      ...base,
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
      ...base,
      type,
      text: "",
      timeLimitSec: 15,
      points: 0,
      choices: [{ text: "", isCorrect: false }, { text: "", isCorrect: false }],
    };
  }
  return {
    ...base,
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
    backgroundTheme: initial?.backgroundTheme ?? DEFAULT_BACKGROUND_THEME,
    musicTheme: initial?.musicTheme ?? DEFAULT_MUSIC_THEME,
    questions: initial?.questions?.length ? initial.questions : [emptyQuestion()],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [previewingMusic, setPreviewingMusic] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

  async function handleMediaUpload(qIndex: number, file: File) {
    setUploadingIndex(qIndex);
    setError(null);
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body });
    setUploadingIndex(null);
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      setError(errBody.error ?? "Échec de l'envoi du fichier");
      return;
    }
    const { url, mediaType } = await res.json();
    updateQuestion(qIndex, { mediaUrl: url, mediaType });
  }

  function toggleMusicPreview(themeKey: string) {
    if (previewingMusic) {
      musicPlayer.stop();
      setPreviewingMusic(false);
      return;
    }
    musicPlayer.play(themeKey);
    setPreviewingMusic(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      visibility: form.visibility,
      backgroundTheme: form.backgroundTheme,
      musicTheme: form.musicTheme === "none" ? null : form.musicTheme,
      questions: form.questions.map((q) => ({
        type: q.type,
        text: q.text,
        mediaUrl: q.mediaUrl || null,
        mediaType: q.mediaType || null,
        mediaDisplayMode: q.mediaDisplayMode,
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

        <div>
          <p className="mb-2 text-sm text-white/70">Fond d&apos;écran pendant la partie</p>
          <div className="flex flex-wrap gap-2">
            {BACKGROUND_THEMES.map((theme) => (
              <button
                key={theme.key}
                type="button"
                onClick={() => setForm((f) => ({ ...f, backgroundTheme: theme.key }))}
                className="flex flex-col items-center gap-1 rounded-lg p-1"
                style={{
                  outline: form.backgroundTheme === theme.key ? `2px solid ${theme.accent}` : "2px solid transparent",
                }}
              >
                <span
                  className="h-10 w-16 rounded-md border border-white/20"
                  style={{ background: theme.gradient }}
                />
                <span className="text-xs text-white/60">{theme.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-end gap-2">
          <label className="flex-1 text-sm text-white/70">
            Musique de fond
            <select
              className="input mt-1"
              value={form.musicTheme}
              onChange={(e) => {
                musicPlayer.stop();
                setPreviewingMusic(false);
                setForm((f) => ({ ...f, musicTheme: e.target.value }));
              }}
            >
              {MUSIC_THEMES.map((theme) => (
                <option key={theme.key} value={theme.key}>
                  {theme.label}
                </option>
              ))}
            </select>
          </label>
          {form.musicTheme !== "none" && (
            <button type="button" onClick={() => toggleMusicPreview(form.musicTheme)} className="btn-secondary">
              {previewingMusic ? "⏸ Stop" : "▶ Écouter"}
            </button>
          )}
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

          <div className="space-y-2">
            <p className="text-sm text-white/70">Image ou vidéo (optionnel)</p>
            {q.mediaUrl ? (
              <div className="flex items-center gap-3">
                {q.mediaType === "VIDEO" ? (
                  <video src={q.mediaUrl} className="h-20 rounded-md" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={q.mediaUrl} alt="" className="h-20 rounded-md object-cover" />
                )}
                <select
                  className="input !w-auto"
                  value={q.mediaDisplayMode}
                  onChange={(e) => updateQuestion(qIndex, { mediaDisplayMode: e.target.value as QuestionForm["mediaDisplayMode"] })}
                >
                  <option value="BEFORE">Avant la question</option>
                  <option value="WITH">Avec la question</option>
                  <option value="FULLSCREEN">Plein écran</option>
                </select>
                <button
                  type="button"
                  className="btn-secondary text-red-300"
                  onClick={() => updateQuestion(qIndex, { mediaUrl: null, mediaType: null })}
                >
                  Retirer
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={(el) => {
                    fileInputRefs.current[qIndex] = el;
                  }}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleMediaUpload(qIndex, file);
                  }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  disabled={uploadingIndex === qIndex}
                  onClick={() => fileInputRefs.current[qIndex]?.click()}
                >
                  {uploadingIndex === qIndex ? "Envoi..." : "+ Ajouter une image/vidéo"}
                </button>
              </div>
            )}
          </div>

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

      <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-[#0f2744]/95 p-4">
        <div className="mx-auto flex max-w-3xl justify-end">
          <button onClick={handleSave} className="btn-primary" disabled={saving || !form.title}>
            {saving ? "Enregistrement..." : "Enregistrer le quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
