import fs from "fs";
import path from "path";

export async function loadCommands(client) {
  const commands = [];
  const commandFiles = fs.readdirSync("./commands").filter(f => f.endsWith(".js"));

  for (const file of commandFiles) {
    const { default: command } = await import(`../commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  }

  await client.application.commands.set(commands);
}
