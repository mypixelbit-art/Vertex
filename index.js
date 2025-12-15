const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const http = require('http');
require('dotenv').config();

// --- Configuration ---
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

// PULLING KEYS FROM RENDER ENVIRONMENT SETTINGS
const SERVER_ID = process.env.OXFORD_SERVER_ID; 
const API_KEY = process.env.OXFORD_API_KEY;

// --- Define Commands ---
// Note: We removed /setup because the keys are now saved in Render!
const commands = [
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

// --- API Helper Function ---
// --- API Helper Function (Debug Version) ---
async function sendServerCommand(commandString) {
    console.log(`Sending command to Server ID: ${SERVER_ID ? 'Loaded OK' : 'MISSING'}`); 

    const response = await fetch('https://api.oxfd.re/v1/server/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'server-id': SERVER_ID,
            'server-key': API_KEY
        },
        body: JSON.stringify({ command: commandString })
    });

    // 1. Get the raw text first (don't parse JSON yet)
    const rawText = await response.text();

    // 2. Check if the request failed
    if (!response.ok) {
        // Log the status and the raw HTML/Text to the console so we can debug
        console.error(`API Error [${response.status}]: ${rawText}`);
        
        // Throw a clean error for the Discord user
        throw new Error(`API Error ${response.status}: The server returned an error (check console logs).`);
    }

    // 3. If it succeeded, try to parse the JSON
    try {
        return JSON.parse(rawText);
    } catch (e) {
        console.error("Failed to parse JSON response:", rawText);
        throw new Error("Invalid JSON response from server.");
    }
}
// --- Initialize Client ---
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// --- Event: Bot Ready ---
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    // Safety check for keys
    if (!SERVER_ID || !API_KEY) {
        console.error("⚠️ CRITICAL: OXFORD_SERVER_ID or OXFORD_API_KEY is missing from Render Environment Variables!");
    } else {
        console.log("✅ Oxford API Keys successfully loaded from Environment.");
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Refreshing application (/) commands...');
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

        const result = await sendServerCommand(commandToSend);
        await interaction.editReply(`✅ **Command Sent!**\nExecuted: \`${commandToSend}\`\nResponse: ${result.message || 'Success'}`);

    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ **Error:** Failed to send command.\nDetails: ${error.message}`);
    }
});

// --- HTTP Server for Render (Keep Alive) ---
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Oxford Bot is online!');
    res.end();
}).listen(port, () => {
    console.log(`Keep-alive server listening on port ${port}`);
});

// --- Start Bot ---
client.login(TOKEN);
