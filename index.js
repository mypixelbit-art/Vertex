// ===============================
// Oxford Discord Bot (Full Code)
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

// --- FIX: fetch for Node < 18 ---
const fetch = (...args) =>
    import('node-fetch').then(({ default: fetch }) => fetch(...args));

// --- Configuration ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// Discord GUILD ID (for slash commands)
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

// Oxford API
const OXFORD_SERVER_ID = process.env.OXFORD_GAME_SERVER_ID;
const OXFORD_API_KEY = process.env.OXFORD_API_KEY;

// --- Safety checks ---
if (!TOKEN || !CLIENT_ID || !DISCORD_GUILD_ID || !OXFORD_SERVER_ID || !OXFORD_API_KEY) {
    console.error("❌ Missing required environment variables!");
}

// --- Slash Commands ---
const commands = [
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a player from the game server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('In-game username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for ban')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a player from the game server')
        .addStringOption(option =>
            option.setName('username')
                .setDescription('In-game username')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for kick')
                .setRequired(true)),

    new SlashCommandBuilder()
        .setName('run')
        .setDescription('Run a custom server command')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Command to run (e.g. "time 12")')
                .setRequired(true)),
].map(cmd => cmd.toJSON());

// --- Send command to Oxford API ---
async function sendServerCommand(command) {
    const response = await fetch('https://api.oxfd.re/v1/server/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'server-id': process.env.OXFORD_SERVER_ID,
            'server-key': process.env.OXFORD_API_KEY
        },
        body: JSON.stringify({ command })
    });

    const text = await response.text();

    console.log("🔴 RAW OXFORD RESPONSE:");
    console.log(text);

    // Try to parse JSON safely
    try {
        return JSON.parse(text);
    } catch {
        return {
            error: true,
            raw: text
        };
    }
}


// --- Discord Client ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// --- Bot Ready ---
client.once('ready', async () => {
    console.log(`✅ Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);

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

// --- Interaction Handler ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    await interaction.deferReply({ ephemeral: true });

    let commandToSend;

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

        if (!result || result.error) {
            return interaction.editReply(
                `❌ Oxford API Error:\n\`\`\`${JSON.stringify(result, null, 2)}\`\`\``
            );
        }

        await interaction.editReply(
            `✅ **Command Sent!**\n\`${commandToSend}\`\n**Response:** ${result.message || 'Success'}`
        );

    } catch (error) {
        console.error(error);
        await interaction.editReply(
            `❌ Error executing command:\n\`${error.message}\``
        );
    }
});

// --- Keep-alive Server (Render) ---
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Oxford Bot is running');
}).listen(PORT, () => {
    console.log(`🌐 Keep-alive server running on port ${PORT}`);
});

// --- Login ---
client.login(TOKEN);
