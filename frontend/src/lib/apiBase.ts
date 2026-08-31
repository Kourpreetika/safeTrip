/** Empty in local `npm run dev` (Vite proxies /api). Set on Vercel to the hosted API origin. */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
