// ===============================
// Vertex Discord Bot (FINAL)
// ===============================

const {
    Client,
    GatewayIntentBits,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const http = require('http');
require('dotenv').config();

// -------------------------------
// Environment Variables
// -------------------------------
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

const OXFORD_SERVER_ID = process.env.OXFORD_GAME_SERVER_ID;
const OXFORD_API_KEY = process.env.OXFORD_API_KEY;

// -------------------------------
// Safety Check
// -------------------------------
if (
    !DISCORD_TOKEN ||
    !CLIENT_ID ||
    !DISCORD_GUILD_ID ||
    !OXFORD_SERVER_ID ||
    !OXFORD_API_KEY
) {
    console.error('❌ Missing required environment variables!');
}

// -------------------------------
// Slash Commands
// -------------------------------
const commands = [
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a player from the game server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('In-game username')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a player from the game server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('In-game username')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('run')
        .setDescription('Run a custom server command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Command to run (example: time 12)')
                .setRequired(true)
        )
].map(cmd => cmd.toJSON());

// -------------------------------
// Oxford API Call (USES BUILT-IN fetch)
// -------------------------------
async function sendServerCommand(command) {
    const response = await fetch('https://api.oxfd.re/v1/server/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'server-id': OXFORD_SERVER_ID,
            'server-key': OXFORD_API_KEY
        },
        body: JSON.stringify({ command })
    });

    const text = await response.text();

    try {
        return JSON.parse(text);
    } catch {
        return { error: true, raw: text };
    }
}

// -------------------------------
// Discord Client
// -------------------------------
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// -------------------------------
// Bot Ready
// -------------------------------
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

    try {
        console.log('🔄 Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, DISCORD_GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered');
    } catch (err) {
        console.error('❌ Failed to register commands:', err);
    }
});

// -------------------------------
// Interaction Handler
// -------------------------------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply({ ephemeral: true });

    let commandToSend = '';

    try {
        if (interaction.commandName === 'ban') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            commandToSend = `ban ${user} ${reason}`;
        }

        if (interaction.commandName === 'kick') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            commandToSend = `kick ${user} ${reason}`;
        }

        if (interaction.commandName === 'run') {
            commandToSend = interaction.options.getString('command');
        }

        const result = await sendServerCommand(commandToSend);

        if (result.error) {
            return interaction.editReply(
                `❌ Oxford API Error:\n\`\`\`${result.raw}\`\`\``
            );
        }

        await interaction.editReply(
            `✅ **Command Sent**\n\`${commandToSend}\`\n**Response:** ${result.message || 'Success'}`
        );

    } catch (err) {
        console.error(err);
        await interaction.editReply(
            `❌ Error:\n\`${err.message}\``
        );
    }
});

// -------------------------------
// Keep-Alive Server (Render)
// -------------------------------
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Vertex bot is online');
}).listen(PORT, () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// -------------------------------
// Start Bot
// -------------------------------
client.login(DISCORD_TOKEN);
