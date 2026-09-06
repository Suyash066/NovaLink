const chalk = require("chalk");
const { request, apiUrl } = require("../api");
const { saveConfig } = require("../config");
const { ask } = require("../prompt");
const { chooseActiveProject } = require("../activeProject");

module.exports = {
  command: "login",
  describe: "Log in and pick which project you're working on",
  builder: (yargs) =>
    yargs
      .option("username", { alias: "u", type: "string", describe: "Email or username" })
      .option("password", { alias: "p", type: "string", describe: "Password" }),
  handler: async (argv) => {
    try {
      const username = argv.username || (await ask("Email or username: "));
      const password = argv.password || (await ask("Password: "));

      const data = await request("/auth/cli-login", {
        method: "POST",
        auth: false,
        body: { emailOrUsername: username, password },
      });

      saveConfig({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        username: data.username,
        apiUrl: apiUrl(),
      });

      console.log(chalk.green(`Logged in as ${data.username}.`));
      await chooseActiveProject();
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
