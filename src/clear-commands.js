require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { clearCommands } = require("./discord-commands");

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || "";

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  try {
    await clearCommands(client.application, guildId);
  } catch (error) {
    console.error("Failed to clear slash commands:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
});

client.login(token);
