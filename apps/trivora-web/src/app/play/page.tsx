import PlayerGame from "@/components/PlayerGame";

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ pin?: string }>;
}) {
  const { pin } = await searchParams;
  return <PlayerGame initialPin={pin ?? ""} />;
}
