const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

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
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();
