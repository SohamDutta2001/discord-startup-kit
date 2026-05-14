import "dotenv/config";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import {
  ActionRowBuilder,
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle
} from "discord.js";
import { setupGambitServer } from "./setup-gambit.js";

const requiredEnv = ["DISCORD_TOKEN"];
const missing = requiredEnv.filter((name) => !process.env[name]);
const SERVER_NAME = process.env.SERVER_NAME || "Gambit";

if (missing.length > 0) {
  console.error(`Missing required environment values: ${missing.join(", ")}`);
  process.exit(1);
}

const dataDir = new URL("../data/", import.meta.url);
const remindersFile = new URL("reminders.json", dataDir);

const standupTemplate = [
  "**Daily Standup**",
  "",
  "```",
  "Yesterday:",
  "Today:",
  "Blockers:",
  "```"
].join("\n");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "project";
}

function findTextChannel(guild, name) {
  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === name
  );
}

function findRole(guild, name) {
  return guild.roles.cache.find((role) => role.name.toLowerCase() === name.toLowerCase());
}

async function getInteractionGuild(interaction) {
  if (interaction.guild) {
    return interaction.guild;
  }
  if (!interaction.guildId) {
    throw new Error("This command must be run inside a Discord server.");
  }
  const cachedGuild = client.guilds.cache.get(interaction.guildId);
  if (cachedGuild) {
    return cachedGuild;
  }

  try {
    return await client.guilds.fetch(interaction.guildId);
  } catch (error) {
    if (error.code === 10004) {
      throw new Error(
        "The bot cannot access this Discord server. Re-invite it with the bot and applications.commands scopes, then try again."
      );
    }
    throw error;
  }
}

async function sendToNamedChannel(guild, channelName, content) {
  await guild.channels.fetch();
  const channel = findTextChannel(guild, channelName);
  if (!channel) {
    throw new Error(`Missing #${channelName}. Run /setup-gambit first.`);
  }
  await channel.send(content);
  return channel;
}

function field(interaction, customId) {
  return interaction.fields.getTextInputValue(customId).trim();
}

function makeModal(customId, title, inputs) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  const rows = inputs.map((input) =>
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId(input.id)
        .setLabel(input.label)
        .setStyle(input.style ?? TextInputStyle.Paragraph)
        .setRequired(input.required ?? true)
        .setMaxLength(input.maxLength ?? 1000)
        .setPlaceholder(input.placeholder ?? "")
    )
  );
  return modal.addComponents(...rows);
}

async function loadReminders() {
  try {
    return JSON.parse(await readFile(remindersFile, "utf8"));
  } catch {
    return {};
  }
}

async function saveReminders(reminders) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(remindersFile, `${JSON.stringify(reminders, null, 2)}\n`);
}

async function setStandupReminder(guildId, channelId, hour, minute) {
  const reminders = await loadReminders();
  reminders[guildId] = {
    channelId,
    hour,
    minute,
    lastSentDate: null
  };
  await saveReminders(reminders);
}

async function checkStandupReminders() {
  const reminders = await loadReminders();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  for (const [guildId, reminder] of Object.entries(reminders)) {
    if (
      reminder.lastSentDate === today ||
      now.getHours() !== reminder.hour ||
      now.getMinutes() !== reminder.minute
    ) {
      continue;
    }

    try {
      const channel = await client.channels.fetch(reminder.channelId);
      if (channel?.isTextBased()) {
        await channel.send(standupTemplate);
        reminders[guildId].lastSentDate = today;
        await saveReminders(reminders);
      }
    } catch (error) {
      console.error(`Failed to send standup reminder for guild ${guildId}:`, error);
    }
  }
}

async function handleSetupGambit(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({
      content: "You need Manage Server permission to run this setup.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = await getInteractionGuild(interaction);
  const result = await setupGambitServer(guild, SERVER_NAME);
  await interaction.editReply(
    `Gambit setup complete. Checked ${result.roles} roles and ${result.channels} channels.`
  );
}

async function handleWeeklyReview(interaction) {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "Run this in a text channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const now = new Date();
  const thread = await interaction.channel.threads.create({
    name: `Weekly Review - ${now.toLocaleDateString()}`,
    autoArchiveDuration: 10080,
    reason: "Gambit weekly review"
  });

  await thread.send([
    "**Weekly Review**",
    "",
    "**Wins**",
    "- ",
    "",
    "**Misses / Lessons**",
    "- ",
    "",
    "**Metrics**",
    "- ",
    "",
    "**Next Priorities**",
    "- ",
    "",
    "**Blockers / Asks**",
    "- "
  ].join("\n"));

  await interaction.reply({ content: `Created ${thread}.`, flags: MessageFlags.Ephemeral });
}

async function handleCreateProject(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "You need Manage Channels permission.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const projectName = interaction.options.getString("name", true);
  const categoryName = `PROJECT - ${projectName}`.slice(0, 100);
  const guild = await getInteractionGuild(interaction);
  await guild.channels.fetch();

  let category = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );
  if (!category) {
    category = await guild.channels.create({
      name: categoryName,
      type: ChannelType.GuildCategory,
      reason: "Gambit project setup"
    });
  }

  const channels = [
    ["overview", "Project brief, owners, goals, and links."],
    ["tasks", "Current tasks and execution notes."],
    ["updates", "Project progress updates."],
    ["bugs", "Project bugs, issues, and follow-ups."]
  ];

  for (const [name, topic] of channels) {
    const existing = guild.channels.cache.find(
      (channel) =>
        channel.type === ChannelType.GuildText &&
        channel.name === name &&
        channel.parentId === category.id
    );
    if (!existing) {
      await guild.channels.create({
        name,
        type: ChannelType.GuildText,
        parent: category,
        topic,
        reason: "Gambit project setup"
      });
    }
  }

  await interaction.editReply(`Project category ready: ${categoryName}.`);
}

async function handleArchiveProject(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "You need Manage Channels permission.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const categoryName = interaction.options.getString("category", true);
  const guild = await getInteractionGuild(interaction);
  await guild.channels.fetch();

  const category = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      channel.name.toLowerCase() === categoryName.toLowerCase()
  );
  if (!category) {
    await interaction.editReply(`I could not find a category named "${categoryName}".`);
    return;
  }

  let archive = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === "ARCHIVE"
  );
  if (!archive) {
    archive = await guild.channels.create({
      name: "ARCHIVE",
      type: ChannelType.GuildCategory,
      reason: "Gambit archive setup"
    });
  }

  const prefix = slugify(category.name.replace(/^PROJECT\s*-\s*/i, ""));
  const children = guild.channels.cache.filter((channel) => channel.parentId === category.id);

  for (const child of children.values()) {
    if (child.type === ChannelType.GuildText) {
      await child.setName(`${prefix}-${child.name}`.slice(0, 100), "Gambit project archive");
    }
    await child.setParent(archive, { lockPermissions: false, reason: "Gambit project archive" });
  }

  await category.setName(`ARCHIVED - ${category.name}`.slice(0, 100), "Gambit project archive");
  await interaction.editReply(`Archived ${children.size} channels from ${categoryName}.`);
}

async function handleOnboardMember(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "You need Manage Roles permission.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const user = interaction.options.getUser("member", true);
  const roleName = interaction.options.getString("role", true);
  const guild = await getInteractionGuild(interaction);
  const member = await guild.members.fetch(user.id);
  const role = findRole(guild, roleName);

  if (!role) {
    await interaction.editReply(`I could not find the ${roleName} role. Run /setup-gambit first.`);
    return;
  }

  await member.roles.add(role, "Gambit onboarding");
  const welcome = [
    `Welcome ${user} to **Gambit?**`,
    "",
    `Role: **${roleName}**`,
    "",
    "**First checklist**",
    "- Read #start-here",
    "- Add yourself to #team-directory",
    "- Check #product-roadmap and current project channels",
    "- Post your first update in #daily-updates"
  ].join("\n");

  await sendToNamedChannel(guild, "start-here", welcome);
  await interaction.editReply(`Onboarded ${user.tag} as ${roleName}.`);
}

async function handleCleanServer(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "You need Manage Channels permission.", flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const guild = await getInteractionGuild(interaction);
  await guild.channels.fetch();

  const textChannels = guild.channels.cache.filter(
    (channel) => channel.type === ChannelType.GuildText && !channel.lastMessageId
  );
  const emptyVoice = guild.channels.cache.filter(
    (channel) => channel.type === ChannelType.GuildVoice && channel.members.size === 0
  );

  const textList = textChannels.map((channel) => `#${channel.name}`).slice(0, 20).join(", ") || "None";
  const voiceList = emptyVoice.map((channel) => channel.name).slice(0, 20).join(", ") || "None";

  await interaction.editReply([
    "**Server cleanup scan**",
    "",
    `Text channels with no visible last message: ${textList}`,
    `Empty voice channels right now: ${voiceList}`,
    "",
    "I did not delete anything. This command only reports."
  ].join("\n"));
}

async function handleStandupReminder(interaction) {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You need Manage Server permission.", flags: MessageFlags.Ephemeral });
    return;
  }

  const hour = interaction.options.getInteger("hour", true);
  const minute = interaction.options.getInteger("minute", true);
  const chosenChannel = interaction.options.getChannel("channel");
  const guild = await getInteractionGuild(interaction);
  const channel = chosenChannel ?? findTextChannel(guild, "daily-standup");

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: "I could not find #daily-standup. Run /setup-gambit or choose a text channel.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await setStandupReminder(interaction.guildId, channel.id, hour, minute);
  await interaction.reply({
    content: `Daily standup reminder set for ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} local Mac time in ${channel}. Keep the bot running for it to post.`,
    flags: MessageFlags.Ephemeral
  });
}

async function handleAgenda(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const item = interaction.options.getString("item", true);
  const guild = await getInteractionGuild(interaction);
  await sendToNamedChannel(guild, "agenda", `**${interaction.user}**: ${item}`);
  await interaction.editReply("Added to #agenda.");
}

async function handlePoll(interaction) {
  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
    await interaction.reply({ content: "Run this in a text channel.", flags: MessageFlags.Ephemeral });
    return;
  }

  const question = interaction.options.getString("question", true);
  const options = [
    interaction.options.getString("option1", true),
    interaction.options.getString("option2", true),
    interaction.options.getString("option3"),
    interaction.options.getString("option4")
  ].filter(Boolean);

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const lines = [
    `**Poll by ${interaction.user}**`,
    "",
    `**${question}**`,
    "",
    ...options.map((opt, i) => `${NUMBER_EMOJIS[i]}  ${opt}`)
  ];

  const msg = await interaction.channel.send(lines.join("\n"));
  for (let i = 0; i < options.length; i++) {
    await msg.react(NUMBER_EMOJIS[i]);
  }

  await interaction.editReply("Poll posted!");
}

async function handleShoutout(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const recipient = interaction.options.getUser("member", true);
  const reason = interaction.options.getString("reason", true);
  const guild = await getInteractionGuild(interaction);

  await sendToNamedChannel(guild, "wins", [
    `**Shoutout from ${interaction.user}**`,
    "",
    `Big thanks to ${recipient}!`,
    "",
    reason
  ].join("\n"));

  await interaction.editReply("Shoutout posted to #wins.");
}

async function showCommandModal(interaction) {
  switch (interaction.commandName) {
    case "daily-update":
      await interaction.showModal(makeModal("daily-update", "Daily Update", [
        { id: "progress", label: "Progress" },
        { id: "blockers", label: "Blockers", required: false },
        { id: "help", label: "Help needed", required: false }
      ]));
      return true;
    case "idea":
      await interaction.showModal(makeModal("idea", "New Idea", [
        { id: "title", label: "Idea title", style: TextInputStyle.Short, maxLength: 100 },
        { id: "problem", label: "Problem / opportunity" },
        { id: "solution", label: "Possible solution" },
        { id: "next", label: "Next step", required: false }
      ]));
      return true;
    case "decision":
      await interaction.showModal(makeModal(`decision:${interaction.options.getString("destination", true)}`, "Decision Log", [
        { id: "decision", label: "Decision" },
        { id: "why", label: "Why" },
        { id: "owner", label: "Owner", style: TextInputStyle.Short, required: false }
      ]));
      return true;
    case "blocker":
      await interaction.showModal(makeModal(`blocker:${interaction.options.getBoolean("tag_core") ? "tag" : "silent"}`, "Blocker", [
        { id: "blocker", label: "What is blocked?" },
        { id: "impact", label: "Impact" },
        { id: "help", label: "Help needed" }
      ]));
      return true;
    case "investor-update":
      await interaction.showModal(makeModal("investor-update", "Investor Update", [
        { id: "traction", label: "Traction" },
        { id: "roadmap", label: "Roadmap" },
        { id: "asks", label: "Asks" },
        { id: "blockers", label: "Blockers / risks", required: false }
      ]));
      return true;
    case "retro":
      await interaction.showModal(makeModal("retro", "Sprint Retrospective", [
        { id: "went_well", label: "What went well?" },
        { id: "didnt_go_well", label: "What didn't go well?" },
        { id: "actions", label: "Action items", required: false, placeholder: "Who owns what, by when" }
      ]));
      return true;
    case "okr":
      await interaction.showModal(makeModal("okr", "OKR", [
        {
          id: "objective",
          label: "Objective",
          style: TextInputStyle.Short,
          maxLength: 200,
          placeholder: "What do you want to achieve?"
        },
        { id: "kr1", label: "Key Result 1", style: TextInputStyle.Short, maxLength: 200 },
        { id: "kr2", label: "Key Result 2", required: false, style: TextInputStyle.Short, maxLength: 200 },
        { id: "kr3", label: "Key Result 3", required: false, style: TextInputStyle.Short, maxLength: 200 }
      ]));
      return true;
    case "bug-report":
      await interaction.showModal(makeModal("bug-report", "Bug Report", [
        { id: "title", label: "Title", style: TextInputStyle.Short, maxLength: 100 },
        { id: "severity", label: "Severity", style: TextInputStyle.Short, maxLength: 20, placeholder: "Critical / High / Low" },
        { id: "steps", label: "Steps to reproduce" },
        { id: "expected_actual", label: "Expected → Actual", placeholder: "Expected: ...\nActual: ..." }
      ]));
      return true;
    case "metrics":
      await interaction.showModal(makeModal("metrics", "Metrics Update", [
        {
          id: "metric",
          label: "Metric name",
          style: TextInputStyle.Short,
          maxLength: 80,
          placeholder: "e.g. MRR, Weekly Active Users, Signups"
        },
        {
          id: "value",
          label: "Value",
          style: TextInputStyle.Short,
          maxLength: 100,
          placeholder: "e.g. $4,200 (+12% WoW)"
        },
        {
          id: "notes",
          label: "Notes",
          required: false,
          placeholder: "Context, what drove the change, what's next"
        }
      ]));
      return true;
    default:
      return false;
  }
}

async function handleModalSubmit(interaction) {
  const [kind, param] = interaction.customId.split(":");
  const guild = await getInteractionGuild(interaction);

  if (kind === "daily-update") {
    await sendToNamedChannel(guild, "daily-updates", [
      `**Daily Update from ${interaction.user}**`,
      "",
      `**Progress**\n${field(interaction, "progress")}`,
      `**Blockers**\n${field(interaction, "blockers") || "None"}`,
      `**Help needed**\n${field(interaction, "help") || "None"}`
    ].join("\n\n"));
    await interaction.reply({ content: "Posted to #daily-updates.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "idea") {
    await sendToNamedChannel(guild, "new-ideas", [
      `**New Idea: ${field(interaction, "title")}**`,
      `Submitted by ${interaction.user}`,
      "",
      `**Problem / opportunity**\n${field(interaction, "problem")}`,
      `**Possible solution**\n${field(interaction, "solution")}`,
      `**Next step**\n${field(interaction, "next") || "Needs triage"}`
    ].join("\n\n"));
    await interaction.reply({ content: "Posted to #new-ideas.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "decision") {
    await sendToNamedChannel(guild, param, [
      `**Decision logged by ${interaction.user}**`,
      "",
      `**Decision**\n${field(interaction, "decision")}`,
      `**Why**\n${field(interaction, "why")}`,
      `**Owner**\n${field(interaction, "owner") || "Unassigned"}`
    ].join("\n\n"));
    await interaction.reply({ content: `Logged to #${param}.`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "blocker") {
    const coreRole = findRole(guild, "Core Team");
    const tag = param === "tag" && coreRole ? `${coreRole} ` : "";
    await sendToNamedChannel(guild, "blockers", [
      `${tag}**Blocker from ${interaction.user}**`,
      "",
      `**Blocked**\n${field(interaction, "blocker")}`,
      `**Impact**\n${field(interaction, "impact")}`,
      `**Help needed**\n${field(interaction, "help")}`
    ].join("\n\n"));
    await interaction.reply({ content: "Posted to #blockers.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "investor-update") {
    const content = [
      `**Investor Update from ${interaction.user}**`,
      "",
      `**Traction**\n${field(interaction, "traction")}`,
      `**Roadmap**\n${field(interaction, "roadmap")}`,
      `**Asks**\n${field(interaction, "asks")}`,
      `**Blockers / risks**\n${field(interaction, "blockers") || "None"}`
    ].join("\n\n");
    await sendToNamedChannel(guild, "strategy", content);
    await interaction.reply({ content: "Posted to #strategy.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "retro") {
    if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
      await interaction.reply({ content: "Run /retro in a text channel.", flags: MessageFlags.Ephemeral });
      return;
    }
    const now = new Date();
    const thread = await interaction.channel.threads.create({
      name: `Retro - ${now.toLocaleDateString()}`,
      autoArchiveDuration: 10080,
      reason: "Sprint retrospective"
    });
    await thread.send([
      `**Retrospective — ${now.toLocaleDateString()}**`,
      `Run by ${interaction.user}`,
      "",
      `**What went well**\n${field(interaction, "went_well")}`,
      "",
      `**What didn't go well**\n${field(interaction, "didnt_go_well")}`,
      "",
      `**Action items**\n${field(interaction, "actions") || "None logged"}`
    ].join("\n"));
    await interaction.reply({ content: `Retro thread created: ${thread}`, flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "okr") {
    const kr2 = field(interaction, "kr2");
    const kr3 = field(interaction, "kr3");
    const lines = [
      `**OKR from ${interaction.user}**`,
      "",
      `**Objective**\n${field(interaction, "objective")}`,
      "",
      "**Key Results**",
      `1. ${field(interaction, "kr1")}`,
      kr2 ? `2. ${kr2}` : null,
      kr3 ? `3. ${kr3}` : null
    ].filter(Boolean);
    await sendToNamedChannel(guild, "okrs", lines.join("\n"));
    await interaction.reply({ content: "Posted to #okrs.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "bug-report") {
    await sendToNamedChannel(guild, "bugs-and-issues", [
      `**Bug Report from ${interaction.user}**`,
      "",
      `**Title**: ${field(interaction, "title")}`,
      `**Severity**: ${field(interaction, "severity")}`,
      "",
      `**Steps to reproduce**\n${field(interaction, "steps")}`,
      "",
      `**Expected → Actual**\n${field(interaction, "expected_actual")}`
    ].join("\n"));
    await interaction.reply({ content: "Posted to #bugs-and-issues.", flags: MessageFlags.Ephemeral });
    return;
  }

  if (kind === "metrics") {
    const notes = field(interaction, "notes");
    const lines = [
      `**Metrics Update from ${interaction.user}**`,
      "",
      `**${field(interaction, "metric")}**: ${field(interaction, "value")}`,
    ];
    if (notes) lines.push("", notes);
    await sendToNamedChannel(guild, "metrics", lines.join("\n"));
    await interaction.reply({ content: "Posted to #metrics.", flags: MessageFlags.Ephemeral });
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}. Serving: ${SERVER_NAME}.`);
  setInterval(checkStandupReminders, 60 * 1000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild()) {
    if (interaction.isRepliable()) {
      await interaction.reply({ content: "Run this inside the Gambit Discord server.", flags: MessageFlags.Ephemeral });
    }
    return;
  }

  try {
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) {
      return;
    }

    if (await showCommandModal(interaction)) {
      return;
    }

    switch (interaction.commandName) {
      case "setup-gambit":
        await handleSetupGambit(interaction);
        break;
      case "daily-standup":
        await sendToNamedChannel(await getInteractionGuild(interaction), "daily-standup", standupTemplate);
        await interaction.reply({ content: "Posted to #daily-standup.", flags: MessageFlags.Ephemeral });
        break;
      case "weekly-review":
        await handleWeeklyReview(interaction);
        break;
      case "create-project":
        await handleCreateProject(interaction);
        break;
      case "archive-project":
        await handleArchiveProject(interaction);
        break;
      case "onboard-member":
        await handleOnboardMember(interaction);
        break;
      case "clean-server":
        await handleCleanServer(interaction);
        break;
      case "standup-reminder":
        await handleStandupReminder(interaction);
        break;
      case "poll":
        await handlePoll(interaction);
        break;
      case "shoutout":
        await handleShoutout(interaction);
        break;
      case "agenda":
        await handleAgenda(interaction);
        break;
      default:
        await interaction.reply({ content: "Unknown command.", flags: MessageFlags.Ephemeral });
    }
  } catch (error) {
    console.error(error);
    const message = error.message?.startsWith("Missing #")
      ? error.message
      : "Command failed. Check the local bot terminal for details.";

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(message);
    } else {
      await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
    }
  }
});

await client.login(process.env.DISCORD_TOKEN);
