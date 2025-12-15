import { EmbedBuilder } from "discord.js";

export function redEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0xE53935) // RED
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}
