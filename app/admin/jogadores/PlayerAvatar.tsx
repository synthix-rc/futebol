// Plain <img>, not next/image — these are external Supabase Storage URLs,
// and wiring up next.config.ts's images.remotePatterns for one small
// avatar thumbnail isn't worth the config surface. Falls back to initials
// when there's no photo (most players won't have one yet).

const SIZE_CLASSES = {
  sm: "h-10 w-10 text-xs",
  lg: "h-24 w-24 text-2xl",
} as const;

export function PlayerAvatar({
  photoUrl,
  name,
  size = "sm",
}: {
  photoUrl: string | null;
  name: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const dimension = SIZE_CLASSES[size];

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Storage URL, see comment above
      <img
        src={photoUrl}
        alt={name}
        loading="lazy"
        className={`${dimension} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div
      className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-foreground/10 font-semibold text-foreground/50`}
    >
      {initials}
    </div>
  );
}
