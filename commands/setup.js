import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { redEmbed } from "../utils/embeds.js";
import { getConfig, setConfig } from "../utils/config.js";
import { fetchServerInfo } from "../utils/oxford.js";

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
    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guild.id;

    if (getConfig(guildId)) {
      return interaction.editReply({
        embeds: [
          redEmbed(
            "❌ Setup Already Completed",
            "This server is already configured."
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
          redEmbed(
            "❌ Oxford API Error",
            err.message
          )
        ]
      });
    }

    // Save config ONLY after successful API call
    setConfig(guildId, {
      serverId,
      apiKey,
      logChannelId: logChannel.id,
      setupBy: interaction.user.id,
      setupAt: Date.now()
    });

    const embed = redEmbed(
      "✅ Setup Complete",
      `**Server Name:** ${serverInfo.Name}
**Players:** ${serverInfo.CurrentPlayers}/${serverInfo.MaxPlayers}
**Join Code:** \`${serverInfo.JoinCode}\`
**Owner ID:** \`${serverInfo.OwnerId}\`

🟢 API connection verified successfully.`
    );

    await interaction.editReply({ embeds: [embed] });
  }
};
