const chalk = require("chalk");
const { request } = require("../api");
const { requireActiveProject } = require("../activeProject");
const { packDirectory } = require("../repoUtils");

module.exports = {
  command: "push",
  describe: "Push the current directory to your active project (maintainer/owner only — contributors use `nova-link pr create`)",
  builder: (yargs) => yargs.option("message", { alias: "m", type: "string", default: "Update" }),
  handler: async (argv) => {
    try {
      const project = requireActiveProject();

      console.log(chalk.dim(`Checking permission on ${project.slug} and packing directory...`));
      const [{ uploadUrl, archiveKey }, archive] = await Promise.all([
        request(`/projects/${project.id}/commits/init`, { method: "POST" }),
        packDirectory(),
      ]);

      console.log(chalk.dim("Uploading to S3..."));
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "application/gzip" },
        body: archive,
      });
      if (!uploadRes.ok) {
        throw new Error(`Upload to S3 failed (${uploadRes.status}). Check the backend's AWS credentials and bucket permissions.`);
      }

      const { commit } = await request(`/projects/${project.id}/commits/finalize`, {
        method: "POST",
        body: { message: argv.message, archiveKey },
      });

      console.log(chalk.green(`Pushed to ${project.slug}. New commit: ${commit._id}`));
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
