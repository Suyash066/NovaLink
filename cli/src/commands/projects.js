const chalk = require("chalk");
const { request } = require("../api");

module.exports = {
  command: "projects",
  describe: "List your projects",
  handler: async () => {
    try {
      const { projects } = await request("/projects");
      if (projects.length === 0) {
        console.log(chalk.dim("No projects yet — create one from the web app."));
        return;
      }
      projects.forEach((p) => {
        console.log(`${chalk.bold(p.name)}  ${chalk.dim(p.slug)}  ${chalk.dim(p.visibility)}`);
      });
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
