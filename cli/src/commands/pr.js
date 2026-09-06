const chalk = require("chalk");
const { request } = require("../api");
const { requireActiveProject } = require("../activeProject");
const { packDirectory } = require("../repoUtils");

async function create(argv) {
  try {
    const project = requireActiveProject();

    console.log(chalk.dim(`Checking permission on ${project.slug} and packing directory...`));
    const [{ uploadUrl, archiveKey }, archive] = await Promise.all([
      request(`/projects/${project.id}/pull-requests/init`, { method: "POST" }),
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

    const { pullRequest } = await request(`/projects/${project.id}/pull-requests/finalize`, {
      method: "POST",
      body: { message: argv.message, archiveKey },
    });

    console.log(chalk.green(`Pull request opened on ${project.slug}: ${pullRequest._id}`));
    console.log(chalk.dim("A maintainer can accept it with `nova-link pr accept <id>`."));
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exitCode = 1;
  }
}

async function list() {
  try {
    const project = requireActiveProject();
    const { pullRequests } = await request(`/projects/${project.id}/pull-requests`);

    if (pullRequests.length === 0) {
      console.log(chalk.dim(`No pull requests on ${project.slug}.`));
      return;
    }
    pullRequests.forEach((pr) => {
      const statusColor = pr.status === "OPEN" ? chalk.yellow : pr.status === "MERGED" ? chalk.green : chalk.dim;
      console.log(`${chalk.bold(pr._id)}  ${statusColor(pr.status)}  ${chalk.dim(pr.author?.username)}  ${pr.message}`);
    });
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exitCode = 1;
  }
}

async function accept(argv) {
  try {
    const project = requireActiveProject();
    const { commit } = await request(`/projects/${project.id}/pull-requests/${argv.id}/accept`, { method: "POST" });
    console.log(chalk.green(`Merged into ${project.slug}. New commit: ${commit._id}`));
    console.log(chalk.dim("Run `nova-link pull` to get the merged code."));
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exitCode = 1;
  }
}

async function reject(argv) {
  try {
    const project = requireActiveProject();
    await request(`/projects/${project.id}/pull-requests/${argv.id}/reject`, { method: "POST" });
    console.log(chalk.yellow("Pull request rejected."));
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exitCode = 1;
  }
}

module.exports = {
  command: "pr",
  describe: "Manage pull requests on your active project",
  builder: (yargs) =>
    yargs
      .command({
        command: "create",
        describe: "Open a pull request (contributor+)",
        builder: (y) => y.option("message", { alias: "m", type: "string", default: "Update" }),
        handler: create,
      })
      .command({ command: "list", describe: "List pull requests", handler: list })
      .command({ command: "accept <id>", describe: "Accept and merge (maintainer/owner)", handler: accept })
      .command({ command: "reject <id>", describe: "Reject (maintainer/owner)", handler: reject })
      .demandCommand(1, "Specify a pr subcommand: create, list, accept, or reject."),
  handler: () => {},
};
