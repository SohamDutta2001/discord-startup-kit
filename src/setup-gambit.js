import {
  ChannelType,
  PermissionFlagsBits
} from "discord.js";
import { categories, roles, getWelcomeCopy } from "./server-plan.js";

function byName(collection, name) {
  return collection.find((item) => item.name.toLowerCase() === name.toLowerCase());
}

async function ensureRole(guild, roleSpec) {
  const existing = byName(guild.roles.cache, roleSpec.name);
  if (existing) {
    return existing;
  }

  return guild.roles.create({
    name: roleSpec.name,
    color: roleSpec.color,
    hoist: Boolean(roleSpec.hoist),
    reason: "Gambit startup server setup"
  });
}

function privateCoreOverwrites(guild, roleMap) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: roleMap.get("Founder").id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    },
    {
      id: roleMap.get("Core Team").id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
    }
  ];
}

function announcementsOverwrites(roleMap) {
  return [
    {
      id: roleMap.get("Founder").id,
      allow: [PermissionFlagsBits.SendMessages]
    },
    {
      id: roleMap.get("Core Team").id,
      allow: [PermissionFlagsBits.SendMessages]
    }
  ];
}

async function ensureCategory(guild, name) {
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === name
  );

  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name,
    type: ChannelType.GuildCategory,
    reason: "Gambit startup server setup"
  });
}

async function ensureTextChannel(guild, parent, channelSpec, roleMap) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildText &&
      channel.name === channelSpec.name &&
      channel.parentId === parent.id
  );

  if (existing) {
    if (channelSpec.topic && existing.topic !== channelSpec.topic) {
      await existing.setTopic(channelSpec.topic, "Gambit startup server setup");
    }
    return existing;
  }

  const permissionOverwrites = [];
  if (channelSpec.privateCore) {
    permissionOverwrites.push(...privateCoreOverwrites(guild, roleMap));
  }
  if (channelSpec.name === "announcements") {
    permissionOverwrites.push(
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.SendMessages]
      },
      ...announcementsOverwrites(roleMap)
    );
  }

  return guild.channels.create({
    name: channelSpec.name,
    type: ChannelType.GuildText,
    parent,
    topic: channelSpec.topic,
    permissionOverwrites,
    reason: "Gambit startup server setup"
  });
}

async function ensureVoiceChannel(guild, parent, channelSpec, roleMap) {
  const existing = guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildVoice &&
      channel.name === channelSpec.name &&
      channel.parentId === parent.id
  );

  if (existing) {
    return existing;
  }

  return guild.channels.create({
    name: channelSpec.name,
    type: ChannelType.GuildVoice,
    parent,
    permissionOverwrites: channelSpec.privateCore ? privateCoreOverwrites(guild, roleMap) : [],
    reason: "Gambit startup server setup"
  });
}

export async function setupGambitServer(guild, serverName) {
  await guild.roles.fetch();
  await guild.channels.fetch();

  const roleMap = new Map();
  for (const roleSpec of roles) {
    const role = await ensureRole(guild, roleSpec);
    roleMap.set(roleSpec.name, role);
  }

  const createdChannels = [];

  for (const categorySpec of categories) {
    const parent = await ensureCategory(guild, categorySpec.name);

    for (const channelSpec of categorySpec.channels) {
      const channel = categorySpec.voice
        ? await ensureVoiceChannel(guild, parent, channelSpec, roleMap)
        : await ensureTextChannel(guild, parent, channelSpec, roleMap);
      createdChannels.push(channel);
    }
  }

  const startHere = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === "start-here"
  );

  if (startHere) {
    await startHere.send(getWelcomeCopy(serverName));
  }

  return {
    roles: roleMap.size,
    channels: createdChannels.length
  };
}
