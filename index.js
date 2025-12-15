import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} from "discord.js";
import fs from "fs";
import http from "http";

/* =======================
   CONFIG
======================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const DB_FILE = "./database.json";

/* =======================
   DATABASE
======================= */

function readDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  const raw = fs.readFileSync(DB_FILE, "utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* =======================
   EMBEDS
======================= */

function redEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xED4245)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

/* =======================
   OXFORD API
======================= */

async function fetchServerInfo(serverId, apiKey) {
  const res = await fetch("https://api.oxfd.re/v1/server", {
    headers: {
      "Content-Type": "application/json",
      "server-id": serverId,
      "server-key": apiKey
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Error ${res.status}: ${text}`);
  }

  return res.json();
}

/* =======================
   SLASH COMMANDS
======================= */

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup the bot for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o =>
      o.setName("server_id").setDescription("Oxford Server ID").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("api_key").setDescription("Oxford API Key").setRequired(true)
    )
    .addChannelOption(o =>
      o.setName("log_channel").setDescription("Log channel").setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

await rest.put(
  Routes.applicationCommands(CLIENT_ID),
  { body: commands }
);

console.log("✅ Slash commands registered");

/* =======================
   CLIENT
======================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   INTERACTIONS
======================= */

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName !== "setup") return;

  await interaction.deferReply({ flags: 64 }); // ephemeral

  try {
    const serverId = interaction.options.getString("server_id");
    const apiKey = interaction.options.getString("api_key");
    const logChannel = interaction.options.getChannel("log_channel");

    const serverInfo = await fetchServerInfo(serverId, apiKey);

    const db = readDB();
    db[interaction.guildId] = {
      serverId,
      apiKey,
      logChannelId: logChannel.id,
      setupBy: interaction.user.id,
      setupAt: Date.now()
    };
    writeDB(db);

    const embed = redEmbed(
      "✅ Setup Complete",
      `**Server:** ${serverInfo.Name}
**Players:** ${serverInfo.CurrentPlayers}/${serverInfo.MaxPlayers}
**Join Code:** \`${serverInfo.JoinCode}\`
**Owner ID:** \`${serverInfo.OwnerId}\`

🟢 Oxford API verified successfully.`
    );

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error(err);
    await interaction.editReply({
      embeds: [redEmbed("❌ Setup Failed", err.message)]
    });
  }
});

/* =======================
   KEEP ALIVE (RENDER)
======================= */

http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Bot is alive");
}).listen(process.env.PORT || 10000);

/* =======================
   LOGIN
======================= */

client.login(TOKEN);
