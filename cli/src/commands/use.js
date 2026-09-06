const chalk = require("chalk");
const { request } = require("../api");
const { loadConfig, saveConfig } = require("../config");

module.exports = {
  command: "use <projectSlug>",
  describe: "Switch which project push/pull/pr act on",
  builder: (yargs) => yargs.positional("projectSlug", { type: "string" }),
  handler: async (argv) => {
    try {
      const { projects } = await request("/projects");
      const project = projects.find((p) => p.slug === argv.projectSlug);
      if (!project) {
        throw new Error(`No project found with slug "${argv.projectSlug}". Run \`nova-link projects\` to see your options.`);
      }

      const cfg = loadConfig();
      saveConfig({ ...cfg, activeProjectId: project._id, activeProjectSlug: project.slug });
      console.log(chalk.green(`Active project: ${project.slug}`));
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
