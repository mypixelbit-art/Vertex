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

/* =======================
   BASIC CONFIG
======================= */

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const DB_FILE = "./database.json";

/* =======================
   DATABASE HELPERS
======================= */

function readDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

/* =======================
   EMBED HELPER
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
    method: "GET",
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

  return await res.json();
}

/* =======================
   SLASH COMMANDS
======================= */

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Setup the bot for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(opt =>
      opt.setName("server_id")
        .setDescription("Oxford Server ID")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("api_key")
        .setDescription("Oxford API Key")
        .setRequired(true)
    )
    .addChannelOption(opt =>
      opt.setName("log_channel")
        .setDescription("Log channel")
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

/* =======================
   REGISTER COMMANDS
======================= */

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(CLIENT_ID),
    { body: commands }
  );
  console.log("✅ Slash commands registered");
})();

/* =======================
   CLIENT
======================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("clientReady", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

/* =======================
   INTERACTIONS
======================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "setup") {
    await interaction.deferReply({ ephemeral: true });

    const db = readDB();
    const guildId = interaction.guild.id;

    if (db[guildId]) {
      return interaction.editReply({
        embeds: [
          redEmbed(
            "❌ Already Configured",
            "This server has already been set up."
          )
        ]
      });
    }

    const serverId = interaction.options.getString("server_id");
    const apiKey = interaction.options.getString("api_key");
    const logChannel = interaction.options.getChannel("log_channel");

    let serverInfo;
    try {
      serverInfo = await fetchServerInfo(serverId, apiKey);
    } catch (err) {
      return interaction.editReply({
        embeds: [
          redEmbed("❌ API Error", err.message)
        ]
      });
    }

    db[guildId] = {
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
  }
});

/* =======================
   KEEP ALIVE (RENDER)
======================= */

import http from "http";
http.createServer((_, res) => {
  res.writeHead(200);
  res.end("Bot is alive");
}).listen(process.env.PORT || 10000);

/* =======================
   LOGIN
======================= */

client.login(TOKEN);
