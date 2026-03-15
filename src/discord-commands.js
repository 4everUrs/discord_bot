function buildCommands() {
  return [
    {
      name: "grade-lookup",
      description: "Send grade information to your DM using a student ID",
      options: [
        {
          type: 3,
          name: "student_id",
          description: "Student ID (example: 18016062)",
          required: true
        }
      ]
    }
  ];
}

async function clearCommands(application, guildId) {
  if (guildId) {
    await application.commands.set([], guildId);
    console.log(`Cleared guild slash commands for guild ${guildId}.`);
    return;
  }

  await application.commands.set([]);
  console.log("Cleared global slash commands.");
}

async function syncCommands(application, guildId) {
  const commands = buildCommands();

  // Clear both scopes first so stale commands like the old custom_id version disappear.
  await application.commands.set([]);
  console.log("Cleared global slash commands before sync.");

  if (guildId) {
    await application.commands.set([], guildId);
    console.log(`Cleared guild slash commands for guild ${guildId} before sync.`);
    await application.commands.set(commands, guildId);
    console.log(`Registered slash commands for guild ${guildId}.`);
    return;
  }

  await application.commands.set(commands);
  console.log("Registered global slash commands.");
}

module.exports = {
  buildCommands,
  clearCommands,
  syncCommands
};
