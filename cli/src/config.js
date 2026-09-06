const os = require("os");
const path = require("path");
const fs = require("fs-extra");

const CONFIG_DIR = path.join(os.homedir(), ".nova-link");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

function loadConfig() {
  try {
    return fs.readJsonSync(CONFIG_PATH);
  } catch (err) {
    return null;
  }
}

function saveConfig(data) {
  fs.ensureDirSync(CONFIG_DIR);
  fs.writeJsonSync(CONFIG_PATH, data, { spaces: 2 });
}

function clearConfig() {
  fs.removeSync(CONFIG_PATH);
}

module.exports = { loadConfig, saveConfig, clearConfig, CONFIG_PATH };
