"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSocket } from "@/lib/socket";
import { BACKGROUND_THEMES, DEFAULT_BACKGROUND_THEME } from "@trivora/shared";
import type {
  PublicPlayer,
  PublicQuestion,
  RevealPayload,
  LeaderboardPayload,
  GameSessionStatus,
} from "@trivora/shared";
import QuestionTimer from "@/components/QuestionTimer";
import PlayerBubbles from "@/components/PlayerBubbles";
import PodiumReveal from "@/components/PodiumReveal";
import AnswerDistributionChart from "@/components/AnswerDistributionChart";
import MediaRenderer from "@/components/MediaRenderer";
import MusicToggle from "@/components/MusicToggle";
import JoinQrCode from "@/components/JoinQrCode";
import { toPlayerPodium, toTeamPodium } from "@/lib/leaderboard";
import { musicPlayer } from "@/lib/musicPlayer";

export default function HostGame({
  sessionId,
  pin,
  quizTitle,
  hostToken,
  teamMode,
  backgroundTheme,
  musicTheme,
}: {
  sessionId: string;
  pin: string;
  quizTitle: string;
  hostToken: string;
  teamMode: boolean;
  backgroundTheme: string;
  musicTheme: string | null;
}) {
  const [status, setStatus] = useState<GameSessionStatus>("LOBBY");
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string; color: string }[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [mediaOnlyPhase, setMediaOnlyPhase] = useState(false);
  const [answerCount, setAnswerCount] = useState({ answeredCount: 0, playerCount: 0 });
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const theme = BACKGROUND_THEMES.find((t) => t.key === backgroundTheme) ?? BACKGROUND_THEMES.find((t) => t.key === DEFAULT_BACKGROUND_THEME)!;

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    socket.emit("host:authenticate", { sessionId, hostToken });

    socket.on("lobby:update", (payload) => {
      setPlayers(payload.players);
      setTeams(payload.teams ?? []);
    });
    socket.on("game:status", (payload) => setStatus(payload.status));
    socket.on("game:question", (payload) => {
      setQuestion(payload);
      setReveal(null);
      setAnswerCount({ answeredCount: 0, playerCount: players.length });
      if (payload.mediaUrl && payload.mediaDisplayMode === "BEFORE") {
        setMediaOnlyPhase(true);
        setTimeout(() => setMediaOnlyPhase(false), 3000);
      } else {
        setMediaOnlyPhase(false);
      }
    });
    socket.on("game:answerCount", setAnswerCount);
    socket.on("game:reveal", setReveal);
    socket.on("game:leaderboard", setLeaderboard);
    socket.on("error", (payload) => setError(payload.message));

    return () => {
      socket.off("lobby:update");
      socket.off("game:status");
      socket.off("game:question");
      socket.off("game:answerCount");
      socket.off("game:reveal");
      socket.off("game:leaderboard");
      socket.off("error");
      socket.disconnect();
      musicPlayer.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hostToken]);

  useEffect(() => {
    if (musicTheme && (status === "LOBBY" || status === "QUESTION" || status === "REVEAL" || status === "LEADERBOARD")) {
      musicPlayer.play(musicTheme);
    } else if (status === "ENDED") {
      musicPlayer.stop();
    }
  }, [musicTheme, status]);

  function next() {
    getSocket().emit("host:next");
  }

  let content: React.ReactNode;

  if (error) {
    content = <p className="card p-8 text-red-300">{error}</p>;
  } else if (status === "LOBBY") {
    content = (
      <div className="flex flex-col items-center gap-8">
        <p className="text-white/60">{quizTitle}</p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="card px-12 py-8 text-center">
            <p className="text-sm uppercase tracking-widest text-white/60">Code de la partie</p>
            <p className="font-display text-6xl font-bold tracking-widest">{pin}</p>
            <p className="mt-2 text-white/60">Va sur trivora.app et entre ce code</p>
          </div>
          <JoinQrCode pin={pin} />
        </div>

        {teamMode && teams.length > 0 ? (
          <div className="flex max-w-2xl flex-wrap justify-center gap-4">
            {teams.map((team) => (
              <div key={team.id} className="card p-3 text-center">
                <p className="mb-1 text-sm font-bold" style={{ color: team.color }}>
                  {team.name}
                </p>
                <div className="flex flex-wrap justify-center gap-1">
                  {players
                    .filter((p) => p.teamId === team.id)
                    .map((p) => (
                      <span key={p.id} className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {p.nickname}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <PlayerBubbles players={players} />
        )}

        {teamMode && (
          <div className="card flex items-center gap-3 p-4">
            <label className="text-sm text-white/70">Nombre d&apos;équipes</label>
            <input
              type="number"
              min={2}
              max={8}
              value={teamCount}
              onChange={(e) => setTeamCount(Number(e.target.value))}
              className="input w-20"
            />
            <button
              onClick={() => getSocket().emit("host:formTeams", { teamCount })}
              className="btn-secondary"
              disabled={players.length === 0}
            >
              {teams.length > 0 ? "Refaire les équipes" : "Former les équipes"}
            </button>
          </div>
        )}

        <button
          onClick={() => getSocket().emit("host:start")}
          className="btn-primary text-lg"
          disabled={players.length === 0 || (teamMode && teams.length === 0)}
        >
          Démarrer ({players.length} joueur{players.length > 1 ? "s" : ""})
        </button>
      </div>
    );
  } else if (status === "QUESTION" && question) {
    const hasMedia = Boolean(question.mediaUrl);
    const fullscreen = hasMedia && question.mediaDisplayMode === "FULLSCREEN";
    content = (
      <div className="relative flex w-full flex-1 flex-col items-center gap-8">
        {fullscreen && question.mediaUrl && (
          <MediaRenderer
            url={question.mediaUrl}
            type={question.mediaType}
            className="absolute inset-0 h-full w-full object-cover opacity-40"
          />
        )}
        <div className="relative z-10 flex w-full max-w-3xl items-center justify-between text-white/60">
          <span>
            Question {question.index + 1} / {question.total}
          </span>
          <QuestionTimer startedAt={question.startedAt} timeLimitSec={question.timeLimitSec} />
        </div>

        {mediaOnlyPhase && question.mediaUrl ? (
          <MediaRenderer url={question.mediaUrl} type={question.mediaType} className="relative z-10 max-h-96 max-w-2xl rounded-xl" />
        ) : (
          <>
            {hasMedia && question.mediaUrl && !fullscreen && question.mediaDisplayMode === "WITH" && (
              <MediaRenderer url={question.mediaUrl} type={question.mediaType} className="relative z-10 max-h-56 rounded-xl" />
            )}
            <h2 className="relative z-10 text-center font-display text-3xl font-bold">{question.text}</h2>
            <div className="relative z-10 grid w-full max-w-3xl grid-cols-2 gap-4">
              {question.choices.map((c, i) => (
                <div key={c.id} className={`card p-4 text-lg font-semibold ${ANSWER_COLORS[i % ANSWER_COLORS.length]}`}>
                  {c.text}
                </div>
              ))}
            </div>
            <p className="relative z-10 text-white/60">
              {answerCount.answeredCount} / {players.length} ont répondu
            </p>
            <button onClick={next} className="relative z-10 btn-secondary">
              Voir les résultats
            </button>
          </>
        )}
      </div>
    );
  } else if (status === "REVEAL" && reveal && question) {
    content = (
      <div className="flex flex-col items-center gap-8">
        <h2 className="text-center font-display text-2xl font-bold">{question.text}</h2>
        <AnswerDistributionChart question={question} reveal={reveal} />
        <p className="text-white/60">
          {reveal.answeredCount} / {reveal.playerCount} ont répondu
        </p>
        <button onClick={next} className="btn-primary">
          Classement
        </button>
      </div>
    );
  } else if (status === "LEADERBOARD" && leaderboard) {
    const rows =
      teamMode && leaderboard.teams
        ? leaderboard.teams.map((t) => ({ id: t.id, label: t.name, score: t.totalScore }))
        : leaderboard.players.map((p) => ({ id: p.id, label: p.nickname, score: p.totalScore }));
    content = (
      <div className="flex flex-col items-center gap-8">
        <h2 className="font-display text-3xl font-bold">Classement</h2>
        <ol className="w-full max-w-md space-y-2">
          {rows.slice(0, 10).map((r, i) => (
            <li key={r.id} className="card flex items-center justify-between px-4 py-2">
              <span>
                {i + 1}. {r.label}
              </span>
              <span className="font-bold">{r.score}</span>
            </li>
          ))}
        </ol>
        <button onClick={next} className="btn-primary">
          Question suivante
        </button>
      </div>
    );
  } else if (status === "ENDED" && leaderboard) {
    const podiumEntries =
      teamMode && leaderboard.teams ? toTeamPodium(leaderboard.teams) : toPlayerPodium(leaderboard.players);
    content = (
      <div className="flex flex-col items-center gap-8">
        <h2 className="font-display text-3xl font-bold">Partie terminée 🎉</h2>
        <PodiumReveal entries={podiumEntries} />
        <div className="flex gap-3">
          <Link href={`/reports/${sessionId}`} className="btn-primary">
            Voir le rapport
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  } else {
    content = <p className="text-white/60">Connexion...</p>;
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-8"
      style={{ background: theme.gradient }}
    >
      <MusicToggle />
      {content}
    </main>
  );
}

const ANSWER_COLORS = ["bg-answer-triangle/80", "bg-answer-diamond/80", "bg-answer-circle/80", "bg-answer-square/80"];
