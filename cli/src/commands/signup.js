const chalk = require("chalk");
const { request, apiUrl } = require("../api");
const { saveConfig } = require("../config");
const { ask } = require("../prompt");
const { chooseActiveProject } = require("../activeProject");

module.exports = {
  command: "signup",
  describe: "Create a new account from the terminal",
  builder: (yargs) =>
    yargs
      .option("username", { alias: "u", type: "string" })
      .option("email", { alias: "e", type: "string" })
      .option("password", { alias: "p", type: "string" }),
  handler: async (argv) => {
    try {
      const username = argv.username || (await ask("Username: "));
      const email = argv.email || (await ask("Email: "));
      const password = argv.password || (await ask("Password: "));

      const data = await request("/auth/signup", {
        method: "POST",
        auth: false,
        body: { username, email, password },
      });

      saveConfig({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        username: data.user.username,
        apiUrl: apiUrl(),
      });

      console.log(chalk.green(`Account created. Logged in as ${data.user.username}.`));
      await chooseActiveProject();
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
