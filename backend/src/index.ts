import http from "node:http";
import { config } from "./config.ts";
import { createApp } from "./app.ts";
import { initSocket } from "./socket.ts";
import { prisma } from "./lib/prisma.ts";

const app = createApp();
const server = http.createServer(app);
initSocket(server);

server.listen(config.port, () => {
  console.log(`SafeTrip API listening on http://localhost:${config.port}`);
});

async function shutdown() {
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
