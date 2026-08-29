type Props = {
  tone?: "light" | "dark";
  className?: string;
};

export function BrandMark({ tone = "light", className = "" }: Props) {
  const label = tone === "light" ? "text-white" : "text-ink";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
        <rect width="32" height="32" rx="8" fill="#F7C948" />
        <circle cx="8" cy="23" r="2.6" fill="#111111" />
        <circle cx="24" cy="9" r="2.6" fill="#111111" />
        <path
          d="M9.2 21.2 C13 17.6 19 14.2 22.8 10.8"
          fill="none"
          stroke="#111111"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className={`text-base font-semibold tracking-tight sm:text-lg ${label}`}>SafeTrip</span>
    </span>
  );
}
