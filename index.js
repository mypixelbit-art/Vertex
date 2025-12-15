const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Configuration ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const DB_PATH = path.join(__dirname, 'database.json');

// --- Define Commands ---
const commands = [
    new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Link this Discord server to your Oxford Server API')
        .addStringOption(option => 
            option.setName('serverid').setDescription('Your Oxford Server ID').setRequired(true))
        .addStringOption(option => 
            option.setName('apikey').setDescription('Your Oxford API Key').setRequired(true)),

    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a player from the game server')
        .addStringOption(option => 
            option.setName('username').setDescription('In-game Username').setRequired(true))
        .addStringOption(option => 
            option.setName('reason').setDescription('Reason for ban').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a player from the game server')
        .addStringOption(option => 
            option.setName('username').setDescription('In-game Username').setRequired(true))
        .addStringOption(option => 
            option.setName('reason').setDescription('Reason for kick').setRequired(true)),

    new SlashCommandBuilder()
        .setName('run')
        .setDescription('Run a custom command on the server')
        .addStringOption(option => 
            option.setName('command').setDescription('The command to run (e.g., "time 12", "announce Hello")').setRequired(true)),
].map(command => command.toJSON());

// --- Database Helper Functions ---
function loadDb() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function saveDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// --- API Helper Function ---
async function sendServerCommand(serverId, apiKey, commandString) {
    // Note: We need 'fetch' (built-in to Node v18+). If using older Node, install 'node-fetch'
    const response = await fetch('https://api.oxfd.re/v1/server/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'server-id': serverId,
            'server-key': apiKey
        },
        body: JSON.stringify({ command: commandString })
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }
    return await response.json();
}

// --- Initialize Client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Event: Bot Ready (Register Commands Here) ---
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Started refreshing application (/) commands...');
        
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Error reloading commands:', error);
    }
});

// --- Event: Interaction Handler ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const db = loadDb();
    const guildId = interaction.guildId;

    // --- /setup Command ---
    if (interaction.commandName === 'setup') {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'You need Administrator permissions to use this.', ephemeral: true });
        }

        const serverId = interaction.options.getString('serverid');
        const apiKey = interaction.options.getString('apikey');

        db[guildId] = { serverId, apiKey };
        saveDb(db);

        await interaction.reply({ content: '✅ API Setup complete! Keys linked to this Discord server.', ephemeral: true });
        return;
    }

    // --- Check Database for Keys ---
    const serverData = db[guildId];
    if (!serverData) {
        return interaction.reply({ content: '❌ This server is not set up yet. An admin must run `/setup` first.', ephemeral: true });
    }

    const { serverId, apiKey } = serverData;

    // --- Execute Game Commands ---
    try {
        await interaction.deferReply(); 

        let commandToSend = '';

        if (interaction.commandName === 'ban') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            commandToSend = `ban ${user} ${reason}`; 
        } 
        else if (interaction.commandName === 'kick') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            commandToSend = `kick ${user} ${reason}`;
        } 
        else if (interaction.commandName === 'run') {
            commandToSend = interaction.options.getString('command');
        }

        const result = await sendServerCommand(serverId, apiKey, commandToSend);
        await interaction.editReply(`✅ **Command Sent!**\nExecuted: \`${commandToSend}\`\nResponse: ${result.message || 'Success'}`);

    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ **Error:** Failed to send command.\nDetails: ${error.message}`);
    }
});

// --- Start Bot ---
client.login(TOKEN);
