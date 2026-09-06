const chalk = require("chalk");
const { request } = require("../api");
const { requireActiveProject } = require("../activeProject");
const { unpackArchive } = require("../repoUtils");

module.exports = {
  command: "pull",
  describe: "Fetch your active project's latest push into the current directory (overwrites local files)",
  handler: async () => {
    try {
      const project = requireActiveProject();
      const { commit } = await request(`/projects/${project.id}/commits/latest`);

      console.log(chalk.dim("Downloading from S3..."));
      const downloadRes = await fetch(commit.downloadUrl);
      if (!downloadRes.ok) throw new Error(`Download from S3 failed (${downloadRes.status}).`);
      const buffer = Buffer.from(await downloadRes.arrayBuffer());

      await unpackArchive(buffer, process.cwd());
      console.log(chalk.green(`Pulled ${project.slug} commit ${commit._id}: ${commit.message}`));
    } catch (err) {
      console.error(chalk.red(err.message));
      process.exitCode = 1;
    }
  },
};
