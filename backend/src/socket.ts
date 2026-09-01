import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { config, isAllowedOrigin } from "./config.ts";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      parseCookie(socket.handshake.headers.cookie, "tm_token");
    if (!token) {
      next();
      return;
    }
    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string };
      socket.data.userId = payload.sub;
    } catch {
      // Public track pages may connect without a session.
    }
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) socket.join(`user:${userId}`);

    socket.on("watch:track", (shareToken: string) => {
      if (typeof shareToken === "string" && shareToken.length >= 8) {
        socket.join(`track:${shareToken}`);
      }
    });

    socket.on("watch:journey", (journeyId: string) => {
      if (typeof journeyId === "string") socket.join(`journey:${journeyId}`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO not initialised");
  return io;
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  const parts = header.split(";").map((p) => p.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) return part.slice(name.length + 1);
  }
  return undefined;
}
