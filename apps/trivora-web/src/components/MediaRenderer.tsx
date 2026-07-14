export default function MediaRenderer({
  url,
  type,
  className,
}: {
  url: string;
  type: "IMAGE" | "VIDEO" | null | undefined;
  className?: string;
}) {
  if (type === "VIDEO") {
    return <video src={url} className={className} autoPlay muted loop playsInline />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}
