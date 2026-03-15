require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const { ensureSchema, findUserDataByCustomId } = require("./db");
const { computeGradeSummary } = require("./grading");

const token = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID || "";
const allowedChannelId = process.env.ALLOWED_CHANNEL_ID || "";

function formatNumber(value, digits = 2) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : "N/A";
}

if (!token) {
  console.error("Missing DISCORD_BOT_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  try {
    await ensureSchema();

    const commands = [
      {
        name: "grade-lookup",
        description: "Send grade information to your DM using a custom ID",
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

    if (guildId) {
      await client.application.commands.set(commands, guildId);
      console.log(`Registered slash commands for guild ${guildId}`);
    } else {
      await client.application.commands.set(commands);
      console.log("Registered global slash commands.");
    }

    console.log(`Logged in as ${client.user.tag}`);
    console.log("Use command: /grade-lookup student_id:<value>");
    if (allowedChannelId) {
      console.log(`Restricted channel ID: ${allowedChannelId}`);
    } else {
      console.log("ALLOWED_CHANNEL_ID is not set. Command works in any channel.");
    }
  } catch (error) {
    console.error("Startup error:", error);
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "grade-lookup") return;
  if (!interaction.inGuild()) return;

  if (allowedChannelId && interaction.channelId !== allowedChannelId) {
    await interaction.reply({
      content: `Please use this command in <#${allowedChannelId}> only.`,
      ephemeral: true
    });
    return;
  }

  try {
    const studentId = interaction.options.getString("student_id", true).trim();
    const userData = await findUserDataByCustomId(studentId);

    if (!userData) {
      await interaction.reply({
        content: `I could not find a record for student ID: ${studentId}`,
        ephemeral: true
      });
      return;
    }

    const gradeSummary = computeGradeSummary(userData.grades);

    const gradeLines = gradeSummary.subjects.length
      ? gradeSummary.subjects.map(
          (grade) =>
            [
              `- ${grade.subject_name}`,
              `  Prelim: ${formatNumber(grade.prelim)}`,
              `  Midterm: ${formatNumber(grade.midterm)}`,
              `  Finals: ${formatNumber(grade.finals)}`,
              `=============================================`,
              `  Final Grade: ${formatNumber(grade.finalGrade)}`,
              `  GWA: ${formatNumber(grade.gwa)}`,
              `  Remarks: ${grade.remarks}`,
              `============Notes=============`,
              `This is your unofficial grade record.`
            ].join("\n")
        )
      : ["No grades found for the latest enrollment."];

    const dmText = [
      "Here is your data:",
      `Student ID: ${userData.student_id}`,
      `First Name: ${userData.firstname}`,
      `Last Name: ${userData.lastname}`,
      `Email: ${userData.email || "N/A"}`,
      `Class: ${userData.class_name || "Not enrolled"}`,
      `Section: ${userData.section || "Not assigned"}`,
      `Overall GWA: ${formatNumber(gradeSummary.gwa)}`,
      "",
      "Grades:",
      ...gradeLines
    ].join("\n");

    await interaction.user.send(dmText);
    await interaction.reply({
      content: "I sent the record to your private DM.",
      ephemeral: true
    });
  } catch (error) {
    if (error.code === 50007) {
      await interaction.reply({
        content: "I cannot DM you. Please enable DMs from server members and try again.",
        ephemeral: true
      });
      return;
    }

    console.error("Error handling grade-lookup command:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Something went wrong while fetching your data.",
        ephemeral: true
      });
    }
  }
});

client.login(token);
