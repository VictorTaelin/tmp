import { WebSocketServer, WebSocket } from "ws";
import { appendFileSync, readFileSync, existsSync, mkdirSync } from "fs";

const wss = new WebSocketServer({ port: 8080 });

function now(): number {
  return Math.floor(Date.now());
}

// Track watchers for each room
const watchers = new Map<string, Set<WebSocket>>();

// Print server time every 1 second
setInterval(() => {
  console.log("Server time:", now());
}, 1000);

// Ensure db directory exists
if (!existsSync("./db")) {
  mkdirSync("./db");
}

wss.on("connection", (ws) => {
  ws.on("message", (buffer) => {
    const message = JSON.parse(buffer.toString());

    switch (message.$) {
      case "get_time": {
        ws.send(JSON.stringify({$: "info_time", time: now()}));
        break;
      }
      case "post": {
        const server_time = now();
        const client_time = Math.floor(message.time);
        const room        = message.room;
        const data        = message.data;
        const path        = `./db/${room}.jsonl`;

        // Calculate index before appending
        let index = 0;
        if (existsSync(path)) {
          const content = readFileSync(path, "utf-8");
          const lines   = content.trim().split("\n").filter(l => l.trim());
          index = lines.length;
        }

        const file_line = JSON.stringify({server_time, client_time, data});
        appendFileSync(path, file_line + "\n");
        console.log("Post received:", {room, data});

        // Broadcast to all watchers
        const room_watchers = watchers.get(room);
        if (room_watchers) {
          const info = {$: "info_post", room, index, server_time, client_time, data};
          const json = JSON.stringify(info);
          for (const watcher of room_watchers) {
            watcher.send(json);
          }
        }
        break;
      }
      case "load": {
        const room = message.room;
        const from = Math.max(0, message.from || 0);
        const path = `./db/${room}.jsonl`;

        if (existsSync(path)) {
          const content = readFileSync(path, "utf-8");
          const lines   = content.trim().split("\n");

          for (let index = from; index < lines.length; index++) {
            const line = lines[index];
            if (line && line.trim()) {
              const record      = JSON.parse(line);
              const server_time = record.server_time;
              const client_time = record.client_time;
              const data        = record.data;
              const message     = {$: "info_post", room, index, server_time, client_time, data};
              ws.send(JSON.stringify(message));
            }
          }
        }
        break;
      }
      case "watch": {
        const room = message.room;
        if (!watchers.has(room)) {
          watchers.set(room, new Set());
        }
        watchers.get(room)!.add(ws);
        console.log("Watching:", {room});
        break;
      }
      case "unwatch": {
        const room = message.room;
        const room_watchers = watchers.get(room);
        if (room_watchers) {
          room_watchers.delete(ws);
          if (room_watchers.size === 0) {
            watchers.delete(room);
          }
        }
        console.log("Unwatching:", {room});
        break;
      }
    }
  });

  // Cleanup on disconnect
  ws.on("close", () => {
    for (const [room, room_watchers] of watchers.entries()) {
      room_watchers.delete(ws);
      if (room_watchers.size === 0) {
        watchers.delete(room);
      }
    }
  });
});

console.log("WebSocket server running on port 8080");
