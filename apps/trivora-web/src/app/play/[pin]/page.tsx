import { redirect } from "next/navigation";

export default async function PlayPinRedirectPage({ params }: { params: Promise<{ pin: string }> }) {
  const { pin } = await params;
  redirect(`/play?pin=${pin}`);
}
