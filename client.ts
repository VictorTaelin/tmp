import { WebSocket } from "ws";
import * as readline from "readline";

type TimeSync = {
  clock_offset: number;     // difference between server clock and local clock
  lowest_ping: number;      // best round-trip time achieved so far
  request_sent_at: number;  // timestamp when last get_time request was sent
};

const time_sync: TimeSync = {
  clock_offset: Infinity,
  lowest_ping: Infinity,
  request_sent_at: 0
};

const ws = new WebSocket("ws://localhost:8080");

function now(): number {
  return Math.floor(Date.now());
}

function server_time(): number {
  return Math.floor(now() + time_sync.clock_offset);
}

// Setup readline for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> "
});

// Handle Ctrl-C and Ctrl-Z to exit gracefully
process.on("SIGINT", () => {
  console.log("\nExiting...");
  ws.close();
  process.exit(0);
});

process.on("SIGTSTP", () => {
  console.log("\nExiting...");
  ws.close();
  process.exit(0);
});

ws.on("open", () => {
  // Send get_time every 2 seconds
  setInterval(() => {
    time_sync.request_sent_at = now();
    ws.send(JSON.stringify({ $: "get_time" }));
  }, 2000);

  // Print server time every 1 second
  //setInterval(() => {
    //console.log("Server time:", server_time());
  //}, 1000);

  // Show prompt
  rl.prompt();
});

// Handle user input
rl.on("line", (input) => {
  const trimmed = input.trim();
  const parts = trimmed.split(" ");
  const command = parts[0];

  switch (command) {
    case "/post": {
      const room = parts[1];
      const json = parts.slice(2).join(" ");
      const data = JSON.parse(json);
      ws.send(JSON.stringify({$: "post", room, time: server_time(), data}));
      break;
    }
    case "/load": {
      const room = parts[1];
      const from = parseInt(parts[2]) || 0;
      ws.send(JSON.stringify({$: "load", room, from}));
      break;
    }
    case "/watch": {
      const room = parts[1];
      ws.send(JSON.stringify({$: "watch", room}));
      break;
    }
    case "/unwatch": {
      const room = parts[1];
      ws.send(JSON.stringify({$: "unwatch", room}));
      break;
    }
  }

  rl.prompt();
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());

  switch (message.$) {
    case "info_time": {
      const time = now();
      const ping = time - time_sync.request_sent_at;
      if (ping < time_sync.lowest_ping) {
        const local_avg_time   = Math.floor((time_sync.request_sent_at + time) / 2);
        time_sync.clock_offset = message.time - local_avg_time;
        time_sync.lowest_ping  = ping;
      }
      break;
    }
    case "info_post": {
      console.log(JSON.stringify(message, null, 2));
      break;
    }
  }
});
