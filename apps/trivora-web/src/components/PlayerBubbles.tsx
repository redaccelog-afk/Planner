import type { PublicPlayer } from "@trivora/shared";

export default function PlayerBubbles({ players }: { players: PublicPlayer[] }) {
  if (players.length === 0) {
    return <p className="text-white/50">En attente de joueurs...</p>;
  }

  return (
    <div className="flex max-w-2xl flex-wrap justify-center gap-2">
      {players.map((p) => (
        <span
          key={p.id}
          className="rounded-full px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: p.avatarColor }}
        >
          {p.nickname}
        </span>
      ))}
    </div>
  );
}
