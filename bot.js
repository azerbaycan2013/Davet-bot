const { Client, GatewayIntentBits, Events, EmbedBuilder } = require("discord.js");

const TOKEN ="MTUxMTQyMDg5MTE2OTU1NDU1Mw.GsLE8A.Aykh_WIEMXjPcd-sXxwprEnOgxDrHeT6bqy8X0";
process.env.DISCORD_BOT_TOKEN;
const LOG_CHANNEL_ID = "1511425239416836197";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const inviteCache = new Map();

client.once(Events.ClientReady, async () => {
  console.log("Bot hazırdır: " + client.user.tag);
  for (const guild of client.guilds.cache.values()) {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach(inv => map.set(inv.code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id, inviterTag: inv.inviter?.tag }));
    inviteCache.set(guild.id, map);
  }
});

client.on(Events.GuildMemberAdd, async (member) => {
  const guild = member.guild;
  const oldCache = inviteCache.get(guild.id) ?? new Map();
  const newInvites = await guild.invites.fetch();
  let inviterId = null;
  for (const [code, inv] of newInvites) {
    const old = oldCache.get(code);
    if ((inv.uses ?? 0) > (old?.uses ?? 0)) {
      inviterId = inv.inviter?.id ?? null;
      break;
    }
  }
  const newMap = new Map();
  newInvites.forEach((inv, code) => newMap.set(code, { uses: inv.uses ?? 0, inviterId: inv.inviter?.id }));
  inviteCache.set(guild.id, newMap);

  const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
  if (!channel) return;

  let total = 0;
  if (inviterId) newInvites.forEach(inv => { if (inv.inviter?.id === inviterId) total += inv.uses ?? 0; });

  const embed = new EmbedBuilder()
    .setColor(inviterId ? 0x5865f2 : 0x57f287)
    .setDescription(
      `👋 <@${member.id}> serverə qatıldı!\n` +
      `📨 Dəvət edən: ${inviterId ? `<@${inviterId}>` : "bilinmir"}\n` +
      (inviterId ? `🏆 <@${inviterId}> bu serverə **${total}** nəfər dəvət etdi` : "")
    )
    .setFooter({ text: `Ümumi üzv: ${guild.memberCount}` })
    .setTimestamp();

  channel.send({ embeds: [embed] });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  const hasOwner = message.member?.roles.cache.some(r => r.name.toLowerCase() === "owner");
  const content = message.content.trim().toLowerCase();

  if (!hasOwner && ["!invites","!leaderboard","!lb"].includes(content)) {
    message.reply("❌ Bu əmri yalnız **Owner** rolu olan üzvlər istifadə edə bilər.");
    return;
  }

  if (content === "!invites") {
    const invites = await message.guild.invites.fetch();
    let total = 0;
    invites.forEach(inv => { if (inv.inviter?.id === message.author.id) total += inv.uses ?? 0; });
    message.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`📨 <@${message.author.id}>, bu serverə **${total}** nəfər dəvət etmisən!`)] });
  }

  if (content === "!leaderboard" || content === "!lb") {
    const invites = await message.guild.invites.fetch();
    const counts = new Map();
    invites.forEach(inv => {
      if (!inv.inviter || !inv.uses) return;
      const e = counts.get(inv.inviter.id);
      e ? e.total += inv.uses : counts.set(inv.inviter.id, { tag: inv.inviter.tag, total: inv.uses });
    });
    const sorted = [...counts.entries()].sort((a,b) => b[1].total - a[1].total).slice(0,10);
    if (!sorted.length) { message.reply("Hələ dəvət yoxdur."); return; }
    const medals = ["🥇","🥈","🥉"];
    const desc = sorted.map(([id,d],i) => `${medals[i]??`**${i+1}.**`} <@${id}> — **${d.total}** dəvət`).join("\n");
    message.reply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🏆 Liderler Cədvəli").setDescription(desc)] });
  }
});

client.login(TOKEN);
