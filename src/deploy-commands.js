import "dotenv/config";
import {
  ChannelType,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

const requiredEnv = ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "DISCORD_GUILD_ID"];
const missing = requiredEnv.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}

const commands = [
  new SlashCommandBuilder()
    .setName("setup-gambit")
    .setDescription("Create the startup channels, roles, and permissions for Gambit.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON(),
  new SlashCommandBuilder()
    .setName("daily-standup")
    .setDescription("Post the daily standup template in #daily-standup.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("daily-update")
    .setDescription("Open a form and post your progress update to #daily-updates.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("idea")
    .setDescription("Submit a startup or product idea to #new-ideas.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("decision")
    .setDescription("Log a decision to #tech-decisions or #strategy.")
    .addStringOption((option) =>
      option
        .setName("destination")
        .setDescription("Where should the decision be logged?")
        .setRequired(true)
        .addChoices(
          { name: "Tech Decisions", value: "tech-decisions" },
          { name: "Strategy", value: "strategy" }
        )
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("blocker")
    .setDescription("Post an urgent blocker to #blockers.")
    .addBooleanOption((option) =>
      option
        .setName("tag_core")
        .setDescription("Tag the Core Team role.")
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("weekly-review")
    .setDescription("Create a weekly review thread in this channel with wins, misses, metrics, and priorities.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("create-project")
    .setDescription("Create a project category with overview, tasks, updates, and bugs.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Project name.")
        .setRequired(true)
        .setMaxLength(60)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("archive-project")
    .setDescription("Move a project category's channels into ARCHIVE.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Project category name, for example PROJECT - Website.")
        .setRequired(true)
        .setMaxLength(100)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("onboard-member")
    .setDescription("Assign a startup role and post a welcome checklist to #start-here.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("Member to onboard.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("role")
        .setDescription("Startup role to assign.")
        .setRequired(true)
        .addChoices(
          { name: "Core Team", value: "Core Team" },
          { name: "Engineering", value: "Engineering" },
          { name: "Product", value: "Product" },
          { name: "Growth", value: "Growth" },
          { name: "Advisor", value: "Advisor" },
          { name: "Intern", value: "Intern" },
          { name: "Guest", value: "Guest" }
        )
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("investor-update")
    .setDescription("Open a form and post a formatted investor update to #strategy.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("clean-server")
    .setDescription("Find empty or unused channels.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON(),
  new SlashCommandBuilder()
    .setName("standup-reminder")
    .setDescription("Schedule the standup template to auto-post to #daily-standup each day while the bot is running.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addIntegerOption((option) =>
      option
        .setName("hour")
        .setDescription("Local hour, 0-23.")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(23)
    )
    .addIntegerOption((option) =>
      option
        .setName("minute")
        .setDescription("Local minute, 0-59.")
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(59)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel to post in. Defaults to #daily-standup.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Post a poll in this channel with up to 4 options. Members vote by reacting.")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("The poll question.")
        .setRequired(true)
        .setMaxLength(200)
    )
    .addStringOption((option) =>
      option
        .setName("option1")
        .setDescription("First option.")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("option2")
        .setDescription("Second option.")
        .setRequired(true)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("option3")
        .setDescription("Third option.")
        .setRequired(false)
        .setMaxLength(100)
    )
    .addStringOption((option) =>
      option
        .setName("option4")
        .setDescription("Fourth option.")
        .setRequired(false)
        .setMaxLength(100)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("shoutout")
    .setDescription("Recognize a team member publicly in #wins.")
    .addUserOption((option) =>
      option
        .setName("member")
        .setDescription("Who to recognize.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Why they deserve the shoutout.")
        .setRequired(true)
        .setMaxLength(500)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("metrics")
    .setDescription("Log a KPI or metric update to #metrics.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("retro")
    .setDescription("Run a sprint retrospective and post a summary thread in the current channel.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("okr")
    .setDescription("Log an objective and key results to #okrs.")
    .toJSON(),
  new SlashCommandBuilder()
    .setName("agenda")
    .setDescription("Add an item to the next meeting agenda in #agenda.")
    .addStringOption((option) =>
      option
        .setName("item")
        .setDescription("The agenda item to add.")
        .setRequired(true)
        .setMaxLength(300)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName("bug-report")
    .setDescription("Submit a structured bug report to #bugs-and-issues.")
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
  { body: commands }
);

console.log(`Registered ${commands.length} slash commands for your Gambit server.`);
