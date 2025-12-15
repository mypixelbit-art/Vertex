import fs from "fs";

const PATH = "./data/config.json";

export function getConfig(guildId) {
  const data = JSON.parse(fs.readFileSync(PATH, "utf8"));
  return data[guildId];
}

export function setConfig(guildId, config) {
  const data = JSON.parse(fs.readFileSync(PATH, "utf8"));
  data[guildId] = config;
  fs.writeFileSync(PATH, JSON.stringify(data, null, 2));
}
