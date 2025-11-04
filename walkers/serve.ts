import { existsSync, readFileSync, writeFileSync } from "fs";

// Kill previous server if exists
const PID_FILE = ".serve.pid";
if (existsSync(PID_FILE)) {
  try {
    const oldPid = parseInt(readFileSync(PID_FILE, "utf-8").trim());
    process.kill(oldPid, "SIGTERM");
    console.log(`Killed previous HTTP server process (PID: ${oldPid})`);
    // Wait for port to be released
    await Bun.sleep(100);
  } catch (e) {
    // Process doesn't exist, ignore
  }
}

// Save current PID
writeFileSync(PID_FILE, process.pid.toString());

// Simple HTTP server for serving the walkers game (legacy; unified in server.ts)
const server = Bun.serve({
  port: 3000,
  async fetch(req) {
    const url = new URL(req.url);
    let filePath = url.pathname;

    // Default to index.html
    if (filePath === "/") {
      filePath = "/index.html";
    }

    // Remove leading slash and prepend current directory
    const file = Bun.file("." + filePath);

    // Check if file exists
    const exists = await file.exists();
    if (!exists) {
      return new Response("Not Found", { status: 404 });
    }

    return new Response(file);
  },
});

console.log(`Walkers game server running at http://localhost:${server.port}`);
console.log(`Open http://localhost:${server.port} in your browser`);
