import { useEffect } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../lib/apiBase";

type Handlers = {
  shareToken?: string;
  journeyId?: string;
  onLocation?: (payload: Record<string, unknown>) => void;
  onSos?: (active: boolean) => void;
  onCompleted?: () => void;
  onDeviation?: () => void;
};

export function useSocket(h: Handlers) {
  useEffect(() => {
    // Join the journey / share-token rooms so the map marker moves without refresh.
    const socket = io(SOCKET_URL || undefined, { withCredentials: true });
    if (h.shareToken) socket.emit("watch:track", h.shareToken);
    if (h.journeyId) socket.emit("watch:journey", h.journeyId);
    if (h.onLocation) socket.on("location:update", h.onLocation);
    if (h.onSos) {
      socket.on("sos:triggered", () => h.onSos?.(true));
      socket.on("sos:cancelled", () => h.onSos?.(false));
    }
    if (h.onCompleted) socket.on("journey:completed", h.onCompleted);
    if (h.onDeviation) socket.on("route:deviation", h.onDeviation);
    return () => {
      socket.disconnect();
    };
  }, [h.shareToken, h.journeyId]);
}
