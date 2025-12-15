const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Initialize Client
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Path to our JSON database
const DB_PATH = path.join(__dirname, 'database.json');

// --- Helper Functions ---

// Load Database
function loadDb() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
        return {};
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

// Save Database
function saveDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Send Command to Oxford API
async function sendServerCommand(serverId, apiKey, commandString) {
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

// --- Bot Events ---

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const db = loadDb();
    const guildId = interaction.guildId;

    // --- /setup Command ---
    if (interaction.commandName === 'setup') {
        // Check if user is admin (Optional security)
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: 'You need Administrator permissions to use this.', ephemeral: true });
        }

        const serverId = interaction.options.getString('serverid');
        const apiKey = interaction.options.getString('apikey');

        // Save to JSON
        db[guildId] = { serverId, apiKey };
        saveDb(db);

        await interaction.reply({ content: '✅ API Setup complete! Keys linked to this Discord server.', ephemeral: true });
        return;
    }

    // --- Check if Server is Setup ---
    const serverData = db[guildId];
    if (!serverData) {
        return interaction.reply({ content: '❌ This server is not set up yet. An admin must run `/setup` first.', ephemeral: true });
    }

    const { serverId, apiKey } = serverData;

    try {
        await interaction.deferReply(); // Bot is "thinking..."

        let commandToSend = '';

        // --- /ban ---
        if (interaction.commandName === 'ban') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            // Format: "ban Username Reason"
            commandToSend = `ban ${user} ${reason}`; 
        } 
        
        // --- /kick ---
        else if (interaction.commandName === 'kick') {
            const user = interaction.options.getString('username');
            const reason = interaction.options.getString('reason');
            // Format: "kick Username Reason"
            commandToSend = `kick ${user} ${reason}`;
        } 
        
        // --- /run (Custom Command) ---
        else if (interaction.commandName === 'run') {
            // Format: whatever the user typed, e.g., "time 7"
            commandToSend = interaction.options.getString('command');
        }

        // Execute API Call
        const result = await sendServerCommand(serverId, apiKey, commandToSend);

        // Success Response
        await interaction.editReply(`✅ **Command Sent!**\nExecuted: \`${commandToSend}\`\nResponse: ${result.message || 'Success'}`);

    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ **Error:** Failed to send command.\nDetails: ${error.message}`);
    }
});

client.login(process.env.DISCORD_TOKEN);
