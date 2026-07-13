import type { PublicPlayer, TeamStanding } from "@trivora/shared";
import type { PodiumEntry } from "@/components/Podium";

export function toPlayerPodium(players: PublicPlayer[]): PodiumEntry[] {
  return players.map((p) => ({ id: p.id, label: p.nickname, color: p.avatarColor, totalScore: p.totalScore }));
}

export function toTeamPodium(teams: TeamStanding[]): PodiumEntry[] {
  return teams.map((t) => ({ id: t.id, label: t.name, color: t.color, totalScore: t.totalScore }));
}
