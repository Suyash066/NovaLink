const chalk = require("chalk");
const { loadConfig, clearConfig } = require("../config");

const logout = {
  command: "logout",
  describe: "Forget your saved login on this machine",
  handler: () => {
    clearConfig();
    console.log(chalk.green("Logged out."));
  },
};

const whoami = {
  command: "whoami",
  describe: "Show who you're logged in as and your active project",
  handler: () => {
    const cfg = loadConfig();
    if (!cfg?.username) {
      console.log(chalk.yellow("Not logged in. Run `nova-link login`."));
      return;
    }
    console.log(`${chalk.bold(cfg.username)}  ${chalk.dim(cfg.apiUrl)}`);
    console.log(
      cfg.activeProjectSlug
        ? `Active project: ${chalk.bold(cfg.activeProjectSlug)}`
        : chalk.dim("No active project — run `nova-link use <slug>`.")
    );
  },
};

module.exports = { logout, whoami };
