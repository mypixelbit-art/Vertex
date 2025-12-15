import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { redEmbed } from "../utils/embeds.js";
import { getConfig, setConfig } from "../utils/config.js";

export default {
  data: new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure the bot for this server")
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
        .setDescription("Channel for bot logs")
        .setRequired(true)
    ),

  async execute(interaction) {
    const guildId = interaction.guild.id;

    // Prevent overwriting setup
    if (getConfig(guildId)) {
      return interaction.reply({
        embeds: [
          redEmbed(
            "❌ Already Configured",
            "This server is already set up.\nContact the bot developer to reset."
          )
        ],
        ephemeral: true
      });
    }

    const serverId = interaction.options.getString("server_id");
    const apiKey = interaction.options.getString("api_key");
    const logChannel = interaction.options.getChannel("log_channel");

    setConfig(guildId, {
      serverId,
      apiKey,
      logChannelId: logChannel.id,
      setupBy: interaction.user.id,
      setupAt: Date.now()
    });

    await interaction.reply({
      embeds: [
        redEmbed(
          "✅ Setup Complete",
          `**Oxford Server ID:** \`${serverId}\`\n` +
          `**Log Channel:** ${logChannel}\n\n` +
          "The bot is now fully configured."
        )
      ]
    });
  }
};
