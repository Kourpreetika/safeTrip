/**
 * HTTP calls always use the same origin (`/api/...`).
 * Local Vite proxies to the API; Vercel rewrites `/api` to Render.
 * That avoids cross-origin "failed to fetch" / no-network errors on register.
 *
 * VITE_API_URL is only for Socket.IO (WebSockets do not go through Vercel well).
 */
export const API_BASE = "";
export const SOCKET_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";
