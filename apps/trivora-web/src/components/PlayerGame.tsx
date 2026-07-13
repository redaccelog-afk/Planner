"use client";

import { useEffect, useRef, useState } from "react";
import { getSocket } from "@/lib/socket";
import type { PublicQuestion, PlayerResultPayload, LeaderboardPayload } from "@trivora/shared";
import QuestionTimer from "@/components/QuestionTimer";
import Podium from "@/components/Podium";
import { toPlayerPodium, toTeamPodium } from "@/lib/leaderboard";

type Phase = "pin" | "nickname" | "connecting" | "lobby" | "question" | "waiting" | "result" | "leaderboard" | "ended";

const ANSWER_COLORS = ["bg-answer-triangle", "bg-answer-diamond", "bg-answer-circle", "bg-answer-square"];

export default function PlayerGame({ initialPin }: { initialPin: string }) {
  const [pin, setPin] = useState(initialPin);
  const [nickname, setNickname] = useState("");
  const [phase, setPhase] = useState<Phase>(initialPin ? "nickname" : "pin");
  const [error, setError] = useState<string | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [puzzleOrder, setPuzzleOrder] = useState<string[]>([]);
  const [result, setResult] = useState<PlayerResultPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [myTeam, setMyTeam] = useState<{ id: string; name: string; color: string } | null>(null);
  const currentQuestionRef = useRef<PublicQuestion | null>(null);
  const playerIdRef = useRef<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on("lobby:update", (payload) => {
      if (!playerIdRef.current) return;
      const me = payload.players.find((p) => p.id === playerIdRef.current);
      const team = me?.teamId ? payload.teams?.find((t) => t.id === me.teamId) ?? null : null;
      setMyTeam(team);
    });
    socket.on("game:question", (payload) => {
      currentQuestionRef.current = payload;
      setQuestion(payload);
      setSelectedChoiceId(null);
      setPuzzleOrder(payload.choices.map((c) => c.id));
      setResult(null);
      setPhase("question");
    });
    socket.on("player:result", (payload) => {
      setResult(payload);
      setPhase("result");
    });
    socket.on("game:reveal", () => {
      setPhase((p) => (p === "waiting" || p === "question" ? "result" : p));
    });
    socket.on("game:leaderboard", (payload) => {
      setLeaderboard(payload);
      setPhase(payload.isFinal ? "ended" : "leaderboard");
    });
    socket.on("error", (payload) => setError(payload.message));

    return () => {
      socket.off("lobby:update");
      socket.off("game:question");
      socket.off("player:result");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("error");
      socket.disconnect();
    };
  }, []);

  function submitPin(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return;
    setPhase("nickname");
  }

  function joinGame(e: React.FormEvent) {
    e.preventDefault();
    if (nickname.trim().length < 2) return;
    setPhase("connecting");
    setError(null);
    const socket = getSocket();
    socket.connect();
    socket.emit("player:join", { pin, nickname: nickname.trim() }, (res) => {
      if (!res.ok) {
        setError(res.error);
        setPhase("nickname");
        socket.disconnect();
        return;
      }
      playerIdRef.current = res.playerId;
      setPhase("lobby");
    });
  }

  function submitChoice(choiceId: string) {
    if (!question) return;
    setSelectedChoiceId(choiceId);
    setPhase("waiting");
    getSocket().emit("player:answer", {
      questionId: question.id,
      choiceId,
      clientElapsedMs: Date.now() - question.startedAt,
    });
  }

  function submitPuzzle() {
    if (!question) return;
    setPhase("waiting");
    getSocket().emit("player:answer", {
      questionId: question.id,
      puzzleOrder,
      clientElapsedMs: Date.now() - question.startedAt,
    });
  }

  function movePuzzleItem(index: number, direction: -1 | 1) {
    setPuzzleOrder((order) => {
      const next = [...order];
      const target = index + direction;
      if (target < 0 || target >= next.length) return next;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  if (phase === "pin") {
    return (
      <Centered>
        <form onSubmit={submitPin} className="card w-full max-w-sm space-y-3 p-6">
          <label className="text-sm text-white/70">Code de la partie</label>
          <input
            className="input text-center text-2xl tracking-widest"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          />
          <button type="submit" className="btn-primary w-full" disabled={pin.length !== 6}>
            Continuer
          </button>
        </form>
      </Centered>
    );
  }

  if (phase === "nickname" || phase === "connecting") {
    return (
      <Centered>
        <form onSubmit={joinGame} className="card w-full max-w-sm space-y-3 p-6">
          <label className="text-sm text-white/70">Ton pseudo</label>
          <input
            className="input text-center text-xl"
            maxLength={20}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={phase === "connecting" || nickname.trim().length < 2}>
            {phase === "connecting" ? "Connexion..." : "Rejoindre"}
          </button>
        </form>
      </Centered>
    );
  }

  if (phase === "lobby") {
    return (
      <Centered>
        <div className="text-center">
          <p className="font-display text-2xl font-bold">Tu es dans la partie !</p>
          {myTeam && (
            <p className="mt-2 font-semibold" style={{ color: myTeam.color }}>
              Ton équipe : {myTeam.name}
            </p>
          )}
          <p className="mt-2 text-white/60">En attente que l&apos;animateur démarre...</p>
        </div>
      </Centered>
    );
  }

  if (phase === "question" && question) {
    if (question.type === "PUZZLE") {
      return (
        <main className="flex min-h-screen flex-col items-center gap-6 p-6">
          <QuestionTimer startedAt={question.startedAt} timeLimitSec={question.timeLimitSec} />
          <h2 className="text-center font-display text-2xl font-bold">{question.text}</h2>
          <p className="text-sm text-white/60">Remets les éléments dans le bon ordre</p>
          <ol className="w-full max-w-sm space-y-2">
            {puzzleOrder.map((choiceId, index) => {
              const choice = question.choices.find((c) => c.id === choiceId);
              return (
                <li key={choiceId} className="card flex items-center justify-between p-3">
                  <span>
                    {index + 1}. {choice?.text}
                  </span>
                  <span className="flex gap-1">
                    <button onClick={() => movePuzzleItem(index, -1)} className="btn-secondary px-2 py-1">
                      ↑
                    </button>
                    <button onClick={() => movePuzzleItem(index, 1)} className="btn-secondary px-2 py-1">
                      ↓
                    </button>
                  </span>
                </li>
              );
            })}
          </ol>
          <button onClick={submitPuzzle} className="btn-primary">
            Valider l&apos;ordre
          </button>
        </main>
      );
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <QuestionTimer startedAt={question.startedAt} timeLimitSec={question.timeLimitSec} />
        <p className="text-center text-white/60">{question.text}</p>
        <div className="grid w-full max-w-md grid-cols-2 gap-4">
          {question.choices.map((c, i) => (
            <button
              key={c.id}
              onClick={() => submitChoice(c.id)}
              className={`h-28 rounded-xl text-lg font-bold ${ANSWER_COLORS[i % ANSWER_COLORS.length]}`}
            >
              {c.text}
            </button>
          ))}
        </div>
      </main>
    );
  }

  if (phase === "waiting") {
    const chosenText = currentQuestionRef.current?.choices.find((c) => c.id === selectedChoiceId)?.text;
    return (
      <Centered>
        <p className="font-display text-2xl font-bold">Réponse envoyée !</p>
        {chosenText && <p className="mt-1 text-white/70">Ta réponse : {chosenText}</p>}
        <p className="mt-2 text-white/60">En attente des autres joueurs...</p>
      </Centered>
    );
  }

  if (phase === "result") {
    const q = currentQuestionRef.current;
    const isPoll = q?.type === "POLL";
    return (
      <Centered>
        {isPoll ? (
          <p className="font-display text-2xl font-bold">Merci pour ta réponse !</p>
        ) : result ? (
          <>
            <p className={`font-display text-3xl font-bold ${result.isCorrect ? "text-green-400" : "text-red-400"}`}>
              {result.isCorrect ? "Bonne réponse !" : "Raté !"}
            </p>
            <p className="mt-2 text-white/70">+{result.pointsAwarded} points</p>
            <p className="mt-1 text-white/50">Total : {result.totalScore} pts · #{result.rank}</p>
          </>
        ) : (
          <p className="font-display text-2xl font-bold text-white/60">Temps écoulé !</p>
        )}
      </Centered>
    );
  }

  if (phase === "leaderboard" && leaderboard) {
    if (myTeam && leaderboard.teams) {
      const teamRank = leaderboard.teams.findIndex((t) => t.id === myTeam.id);
      const team = leaderboard.teams[teamRank];
      return (
        <Centered>
          <p className="font-display text-2xl font-bold">Classement</p>
          {team && (
            <p className="mt-2 text-white/70">
              {myTeam.name} est #{teamRank + 1} avec {team.totalScore} pts
            </p>
          )}
        </Centered>
      );
    }
    const mine = leaderboard.players.find((p) => p.nickname === nickname.trim());
    return (
      <Centered>
        <p className="font-display text-2xl font-bold">Classement</p>
        {mine && (
          <p className="mt-2 text-white/70">
            Tu es #{leaderboard.players.indexOf(mine) + 1} avec {mine.totalScore} pts
          </p>
        )}
      </Centered>
    );
  }

  if (phase === "ended" && leaderboard) {
    const podiumEntries =
      myTeam && leaderboard.teams ? toTeamPodium(leaderboard.teams) : toPlayerPodium(leaderboard.players);
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
        <p className="font-display text-3xl font-bold">Partie terminée 🎉</p>
        <Podium entries={podiumEntries} />
      </main>
    );
  }

  return <Centered>Connexion...</Centered>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">{children}</main>;
}
