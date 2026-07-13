import { notFound } from "next/navigation";
import { signHostToken } from "@trivora/shared";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import HostGame from "@/components/HostGame";

export default async function HostSessionPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  const session = await auth();
  if (!session?.user?.id) notFound();

  const gameSession = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: { quiz: { select: { title: true } } },
  });
  if (!gameSession || gameSession.hostId !== session.user.id) notFound();

  const secret = process.env.TRIVORA_REALTIME_SECRET;
  if (!secret) throw new Error("TRIVORA_REALTIME_SECRET is required");
  const hostToken = signHostToken(sessionId, secret);

  return (
    <HostGame
      sessionId={sessionId}
      pin={gameSession.pin}
      quizTitle={gameSession.quiz.title}
      hostToken={hostToken}
      teamMode={gameSession.teamMode}
    />
  );
}
