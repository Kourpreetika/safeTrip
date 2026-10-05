export function etaCaption(source?: string | null): string {
  if (source === "osrm") return "Based on the current route";
  return "";
}

export function etaDisplay(minutes?: number | null): string {
  if (minutes == null) return "Updating…";
  return `${minutes} min`;
}
