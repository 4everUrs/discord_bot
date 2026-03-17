const { spawn } = require("child_process");
const path = require("path");
const { runMigration } = require("./migrate");

const children = new Set();
let shuttingDown = false;

function startProcess(label, scriptFile) {
  const child = spawn(process.execPath, [path.join(__dirname, scriptFile)], {
    stdio: "inherit",
    env: process.env
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) {
      return;
    }

    if (code !== 0) {
      console.error(`${label} exited with code ${code ?? "unknown"}${signal ? ` (signal: ${signal})` : ""}.`);
      shutdown(code || 1);
      return;
    }

    console.log(`${label} exited.`);
    shutdown(0);
  });

  child.on("error", (error) => {
    console.error(`Failed to start ${label}:`, error);
    shutdown(1);
  });
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGINT");
    }
  }

  process.exit(exitCode);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

async function main() {
  const didRunMigration = await runMigration({ onlyIfDatabaseMissing: true });

  if (didRunMigration) {
    console.log("Database was missing, so migration was run automatically.");
  }

  startProcess("Discord bot", "index.js");
  startProcess("Admin server", "admin.js");
}

main().catch((error) => {
  console.error("Failed to start services:", error);
  shutdown(1);
});
