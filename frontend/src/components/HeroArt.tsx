/** Original geometric scene: a traveller sharing a live path with contacts watching a map. */
export function HeroArt() {
  return (
    <svg
      viewBox="0 0 480 360"
      role="img"
      aria-label="A traveller sharing a live journey while trusted contacts watch the map"
      className="h-auto w-full"
    >
      <rect width="480" height="360" rx="24" fill="#FAFAF8" />
      <rect x="16" y="16" width="448" height="328" rx="20" fill="#FFFFFF" stroke="#E6E6E4" />

      <circle cx="92" cy="78" r="28" fill="#F7C948" opacity="0.35" />
      <circle cx="400" cy="64" r="18" fill="#111111" opacity="0.06" />
      <rect x="38" y="292" width="404" height="10" rx="5" fill="#F7C948" />
      <rect x="38" y="292" width="404" height="10" rx="5" fill="#111111" opacity="0.08" />

      <rect x="52" y="168" width="132" height="72" rx="16" fill="#1A1A1A" />
      <rect x="62" y="176" width="52" height="28" rx="6" fill="#F7C948" />
      <rect x="122" y="180" width="50" height="20" rx="4" fill="#FAFAF8" opacity="0.2" />
      <circle cx="80" cy="250" r="16" fill="#111111" />
      <circle cx="80" cy="250" r="7" fill="#F7C948" />
      <circle cx="156" cy="250" r="16" fill="#111111" />
      <circle cx="156" cy="250" r="7" fill="#F7C948" />
      <rect x="70" y="236" width="96" height="14" rx="4" fill="#1A1A1A" />

      <circle cx="118" cy="128" r="22" fill="#1A1A1A" />
      <circle cx="118" cy="128" r="8" fill="#F7C948" />
      <rect x="96" y="150" width="44" height="54" rx="12" fill="#1A1A1A" />
      <rect x="132" y="162" width="18" height="28" rx="5" fill="#F7C948" />
      <rect x="136" y="166" width="10" height="14" rx="2" fill="#FFFFFF" />
      <circle cx="141" cy="172" r="2.2" fill="#DC2626" />

      <path
        d="M158 186 C210 150 250 210 292 168"
        fill="none"
        stroke="#111111"
        strokeWidth="3"
        strokeDasharray="7 8"
        strokeLinecap="round"
      />
      <circle cx="210" cy="168" r="5" fill="#F7C948" stroke="#111111" strokeWidth="1.5" />
      <circle cx="258" cy="186" r="5" fill="#F7C948" stroke="#111111" strokeWidth="1.5" />

      <rect x="292" y="92" width="140" height="196" rx="22" fill="#111111" />
      <rect x="304" y="108" width="116" height="164" rx="12" fill="#FAFAF8" />
      <path d="M304 150 H420" stroke="#E6E6E4" />
      <path d="M304 192 H420" stroke="#E6E6E4" />
      <path d="M342 108 V272" stroke="#E6E6E4" />
      <path d="M380 108 V272" stroke="#E6E6E4" />
      <path
        d="M322 240 C344 210 368 188 402 156"
        fill="none"
        stroke="#111111"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <circle cx="322" cy="240" r="6" fill="#F7C948" stroke="#111111" strokeWidth="1.5" />
      <circle cx="402" cy="156" r="7" fill="#DC2626" stroke="#FFFFFF" strokeWidth="2" />

      <circle cx="318" cy="86" r="14" fill="#1A1A1A" />
      <rect x="308" y="98" width="20" height="18" rx="6" fill="#1A1A1A" />
      <circle cx="406" cy="86" r="14" fill="#1A1A1A" />
      <rect x="396" y="98" width="20" height="18" rx="6" fill="#1A1A1A" />
      <rect x="328" y="72" width="68" height="8" rx="4" fill="#F7C948" />
    </svg>
  );
}
